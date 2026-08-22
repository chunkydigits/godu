import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AnalyticsEvent } from '../../../../core/analytics/analytics-event';
import { AnalyticsService } from '../../../../core/analytics/analytics.service';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { MaterialModule } from '../../../../core/material.module';
import { StepsEditorFormComponent } from '../../components/steps-editor-form/steps-editor-form.component';
import { StepsEditorPreviewComponent } from '../../components/steps-editor-preview/steps-editor-preview.component';
import {
  CreateStepsItemRequest,
  UpdateStepsItemRequest,
} from '../../models/api-steps-item.model';
import { EDITOR_SECTIONS, EditorSectionId } from '../../models/editor-sections';
import {
  DEFAULT_GAP_SECONDS,
  DEFAULT_STEP_ENTRY_KIND,
  GAP_MESSAGE_MAX_LENGTH,
  GAP_SECONDS_MAX,
  GAP_SECONDS_MIN,
  StepEntryKind,
  activityCount,
  hasStartGapOverride,
  normaliseGapMessage,
  normaliseGapSeconds,
  stepEntryKind,
} from '../../models/step-entry';
import {
  buildTikTokSourceUrl,
  formatCreatorDisplayName,
  parseTikTokVideo,
  suggestTitleFromTikTok,
} from '../../models/tiktok-video-id';
import {
  MyStepsApiService,
  TikTokVideoMetadata,
} from '../../services/my-steps-api.service';

interface EditorSaveState {
  saving: boolean;
  error: string | null;
}

/** Raw value of one entry in the steps form array; shape depends on its kind. */
interface StepEntryFormValue {
  id?: string;
  order?: number;
  kind?: string;
  title?: string;
  description?: string;
  startSeconds?: number | string;
  endSeconds?: number | string;
  durationSeconds?: number | string | null;
  autoAdvance?: boolean;
  loopVideo?: boolean;
  message?: string;
}

const LAYOUT_KEY = 'godu.editor.videoOnEnd';

@Component({
  selector: 'app-steps-editor-page',
  imports: [
    PageTemplateComponent,
    MaterialModule,
    ReactiveFormsModule,
    RouterLink,
    AsyncPipe,
    StepsEditorPreviewComponent,
    StepsEditorFormComponent,
  ],
  templateUrl: './steps-editor-page.component.html',
  styleUrl: './steps-editor-page.component.scss',
})
export class StepsEditorPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly myStepsApi = inject(MyStepsApiService);
  private readonly analytics = inject(AnalyticsService);

  private readonly saveTrigger$ = new Subject<void>();

  /** Last values written by URL autofill — do not overwrite user edits. */
  private lastAutoCreator = '';
  private lastAutoTitle = '';
  private lastAutoDescription = '';
  private lastTrackedVideoId: string | null = null;

  readonly continuousSoundtrackEnabled = environment.features.continuousSoundtrack;
  readonly editId$ = this.route.paramMap.pipe(map((p) => p.get('id')));
  readonly isEditMode = !!this.route.snapshot.paramMap.get('id');

  constructor() {
    if (!this.isEditMode) {
      this.analytics.trackOnce('create', AnalyticsEvent.CreateStarted);
    }
  }

  /** Desktop: when true, video column is on the end (right in LTR). */
  readonly videoOnEnd = signal(readVideoOnEnd());

  /** Keyed by control so collapse state survives reordering. */
  readonly collapsedEntries = new Set<AbstractControl>();

  /**
   * Sections behave as an accordion, so at most one is open. Editing usually
   * means tweaking steps, while a new item starts at the video.
   */
  readonly openSection = signal<EditorSectionId | null>(
    this.isEditMode ? 'steps' : 'video',
  );

  readonly form = this.fb.nonNullable.group({
    videoInput: ['', [Validators.required]],
    title: ['', [Validators.required, Validators.minLength(1)]],
    description: [''],
    creatorDisplayName: [''],
    continuousSoundtrack: [false],
    // A new item has no default gap, so the lock starts on to match.
    noGaps: [true],
    gapSeconds: [
      { value: null as number | null, disabled: true },
      [Validators.min(1), Validators.max(600)],
    ],
    gapMessage: [{ value: '', disabled: true }, [Validators.maxLength(200)]],
    playGapPriorToStart: [false],
    overrideStartGap: [{ value: false, disabled: true }],
    startGapSeconds: [
      { value: null as number | null, disabled: true },
      [Validators.min(1), Validators.max(600)],
    ],
    startGapMessage: [{ value: '', disabled: true }, [Validators.maxLength(200)]],
    steps: this.fb.array<FormGroup>([this.createStepGroup(1)]),
  });

  /** Keeps the gap fields locked in step with the checkbox for the component lifetime. */
  private readonly gapLock = toSignal(
    this.form.controls.noGaps.valueChanges.pipe(
      tap((noGaps) => this.applyNoGaps(noGaps)),
    ),
    { initialValue: true },
  );

  private readonly playGapLock = toSignal(
    this.form.controls.playGapPriorToStart.valueChanges.pipe(
      tap((enabled) => this.applyPlayGapPriorToStart(enabled)),
    ),
    { initialValue: false },
  );

  private readonly overrideStartGapLock = toSignal(
    this.form.controls.overrideStartGap.valueChanges.pipe(
      tap((enabled) => this.applyOverrideStartGap(enabled)),
    ),
    { initialValue: false },
  );

  readonly previewVideoId = toSignal(
    this.form.controls.videoInput.valueChanges.pipe(
      startWith(this.form.controls.videoInput.value),
      map((value) => parseTikTokVideo(value)?.videoId ?? null),
      distinctUntilChanged(),
    ),
    { initialValue: null as string | null },
  );

  /** Keeps autofill subscribed for the component lifetime. */
  private readonly videoAutofill = toSignal(
    this.form.controls.videoInput.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap((value) => {
        const parsed = parseTikTokVideo(value);
        this.applyUrlAutofill(parsed?.username ?? null);

        if (!parsed) {
          return of(null);
        }

        const isNewSubmission = parsed.videoId !== this.lastTrackedVideoId;
        if (isNewSubmission) {
          this.lastTrackedVideoId = parsed.videoId;
          this.analytics.track(AnalyticsEvent.VideoUrlSubmitted, { platform: 'tiktok' });
        }

        const lookupKey = value.trim().startsWith('http') ? value.trim() : parsed.sourceUrl;
        return this.myStepsApi.lookupTikTokMetadata(lookupKey).pipe(
          tap((metadata) => {
            this.applyOEmbedAutofill(metadata);
            if (isNewSubmission) {
              this.analytics.track(AnalyticsEvent.VideoLoaded, { platform: 'tiktok' });
            }
          }),
          catchError(() => {
            if (isNewSubmission) {
              this.analytics.track(AnalyticsEvent.VideoLoadFailed, {
                platform: 'tiktok',
                failureReason: 'unsupported-video',
              });
            }
            return of(null);
          }),
        );
      }),
    ),
    { initialValue: null },
  );

  readonly loadState$: Observable<{ loading: boolean; error: string | null }> =
    this.editId$.pipe(
      switchMap((id) => {
        if (!id) {
          return of({ loading: false, error: null });
        }
        return this.myStepsApi.get(id).pipe(
          tap((item) => {
            this.lastAutoCreator = '';
            this.lastAutoTitle = '';
            this.lastAutoDescription = '';
            this.lastTrackedVideoId =
              parseTikTokVideo(item.video.sourceUrl || item.video.externalVideoId)?.videoId ?? null;
            const noGaps = (item.gapSeconds ?? 0) <= 0;
            this.form.patchValue(
              {
                videoInput: item.video.sourceUrl || item.video.externalVideoId,
                title: item.title,
                description: item.description ?? '',
                creatorDisplayName: item.creatorDisplayName ?? '',
                continuousSoundtrack: item.continuousSoundtrack,
                gapSeconds: item.gapSeconds ?? null,
                gapMessage: item.gapMessage ?? '',
                playGapPriorToStart: !!item.playGapPriorToStart,
                overrideStartGap: hasStartGapOverride(item),
                startGapSeconds: item.startGapSeconds ?? null,
                startGapMessage: item.startGapMessage ?? '',
                noGaps,
              },
              { emitEvent: true },
            );
            this.applyNoGaps(noGaps);
            this.applyPlayGapPriorToStart(!!item.playGapPriorToStart);
            this.steps.clear();
            this.collapsedEntries.clear();
            for (const step of [...item.steps].sort((a, b) => a.order - b.order)) {
              const group =
                stepEntryKind(step) === 'gap'
                  ? this.createGapGroup(step.order, {
                      id: step.id,
                      durationSeconds: step.durationSeconds ?? DEFAULT_GAP_SECONDS,
                      message: step.message ?? '',
                    })
                  : this.createStepGroup(step.order, {
                      id: step.id,
                      title: step.title,
                      description: step.description ?? '',
                      startSeconds: step.startSeconds,
                      endSeconds: step.endSeconds,
                      durationSeconds: step.durationSeconds ?? null,
                      autoAdvance: step.autoAdvance,
                      loopVideo: step.loopVideo !== false,
                    });
              this.steps.push(group);
              // Saved entries start collapsed so the whole run is visible at once.
              this.collapsedEntries.add(group);
            }
          }),
          map(() => ({ loading: false, error: null as string | null })),
          startWith({ loading: true, error: null as string | null }),
          catchError((err: Error) =>
            of({
              loading: false,
              error: err.message || 'Could not load Steps item.',
            }),
          ),
        );
      }),
    );

  readonly saveState$: Observable<EditorSaveState> = this.saveTrigger$.pipe(
    switchMap(() => {
      const request = this.buildRequest();
      if (!request) {
        return of({ saving: false, error: 'Check title, TikTok video, and step times.' });
      }

      const id = this.route.snapshot.paramMap.get('id');
      const save$ = id
        ? this.myStepsApi.update(id, request)
        : this.myStepsApi.create(request);

      return save$.pipe(
        tap((saved) => {
          this.analytics.track(AnalyticsEvent.GoduSaved, {
            goduId: saved.id,
            stepCount: activityCount(saved.steps),
            visibility: saved.visibility,
            platform: saved.video.provider || 'tiktok',
          });
          void this.router.navigate(['/play', saved.id]);
        }),
        map(() => ({ saving: false, error: null as string | null })),
        startWith({ saving: true, error: null as string | null }),
        catchError((err: Error) =>
          of({
            saving: false,
            error: err.message || 'Save failed.',
          }),
        ),
      );
    }),
  );

  get steps(): FormArray {
    return this.form.controls.steps;
  }

  toggleLayout(): void {
    const next = !this.videoOnEnd();
    this.videoOnEnd.set(next);
    writeVideoOnEnd(next);
  }

  addEntry(kind: StepEntryKind = DEFAULT_STEP_ENTRY_KIND): void {
    const order = this.steps.length + 1;
    // Left expanded: a new entry still needs filling in.
    this.steps.push(
      kind === 'gap' ? this.createGapGroup(order) : this.createStepGroup(order),
    );
    if (kind === 'step') {
      this.analytics.track(AnalyticsEvent.StepAdded, { stepNumber: this.activityStepCount });
    }
  }

  /**
   * "No gaps" greys out the default gap fields; clearing it offers a usable gap
   * rather than an empty box that would mean no gaps anyway.
   */
  private applyNoGaps(noGaps: boolean): void {
    const { gapSeconds, gapMessage } = this.form.controls;
    if (noGaps) {
      gapSeconds.disable({ emitEvent: false });
      gapMessage.disable({ emitEvent: false });
      return;
    }
    if (gapSeconds.value == null) {
      gapSeconds.setValue(DEFAULT_GAP_SECONDS, { emitEvent: false });
    }
    gapSeconds.enable({ emitEvent: false });
    gapMessage.enable({ emitEvent: false });
  }

  private applyPlayGapPriorToStart(enabled: boolean): void {
    const { overrideStartGap } = this.form.controls;
    if (!enabled) {
      overrideStartGap.setValue(false, { emitEvent: false });
      overrideStartGap.disable({ emitEvent: false });
      this.applyOverrideStartGap(false);
      return;
    }
    overrideStartGap.enable({ emitEvent: false });
    this.applyOverrideStartGap(!!overrideStartGap.value);
  }

  private applyOverrideStartGap(enabled: boolean): void {
    const { startGapSeconds, startGapMessage } = this.form.controls;
    if (!enabled) {
      startGapSeconds.disable({ emitEvent: false });
      startGapMessage.disable({ emitEvent: false });
      return;
    }
    startGapSeconds.enable({ emitEvent: false });
    startGapMessage.enable({ emitEvent: false });
  }

  toggleSection(id: EditorSectionId): void {
    this.openSection.update((current) => (current === id ? null : id));
  }

  toggleEntry(index: number): void {
    const control = this.steps.at(index);
    if (!control) {
      return;
    }
    if (this.collapsedEntries.has(control)) {
      this.collapsedEntries.delete(control);
    } else {
      this.collapsedEntries.add(control);
    }
  }

  entryDropped(event: CdkDragDrop<unknown>): void {
    const { previousIndex, currentIndex } = event;
    if (previousIndex === currentIndex) {
      return;
    }
    const control = this.steps.at(previousIndex);
    if (!control) {
      return;
    }
    this.steps.removeAt(previousIndex);
    this.steps.insert(currentIndex, control);
    this.renumberSteps();
  }

  /** Gaps can always go; the last remaining activity step cannot. */
  canRemoveEntry(index: number): boolean {
    const entry = this.steps.at(index)?.getRawValue() as StepEntryFormValue | undefined;
    if (!entry) {
      return false;
    }
    return stepEntryKind(entry) === 'gap' || this.activityStepCount > 1;
  }

  removeEntry(index: number): void {
    if (!this.canRemoveEntry(index)) {
      return;
    }
    const entry = this.steps.at(index)?.getRawValue() as StepEntryFormValue | undefined;
    if (entry && stepEntryKind(entry) === 'step') {
      const entries = this.steps.getRawValue() as StepEntryFormValue[];
      this.analytics.track(AnalyticsEvent.StepDeleted, {
        stepNumber: activityCount(entries.slice(0, index + 1)),
      });
    }
    const control = this.steps.at(index);
    if (control) {
      this.collapsedEntries.delete(control);
    }
    this.steps.removeAt(index);
    this.renumberSteps();
  }

  get activityStepCount(): number {
    return activityCount(this.steps.getRawValue() as StepEntryFormValue[]);
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.revealInvalidSection();
    this.expandInvalidEntries();
    this.saveTrigger$.next();
  }

  /**
   * Only one section can be open, so show the first one with a problem and
   * leave the current section alone while it still has its own.
   */
  private revealInvalidSection(): void {
    const sections = Object.values(EDITOR_SECTIONS);
    const invalid = sections.filter((section) =>
      section.controls.some((name) => this.form.get(name)?.invalid),
    );
    if (invalid.length === 0 || invalid.some((s) => s.id === this.openSection())) {
      return;
    }
    this.openSection.set(invalid[0].id);
  }

  /** Collapsed fields hide their own errors, so reveal anything that failed. */
  private expandInvalidEntries(): void {
    for (const control of this.steps.controls) {
      if (control.invalid) {
        this.collapsedEntries.delete(control);
      }
    }
  }

  private applyUrlAutofill(username: string | null): void {
    const patch: {
      creatorDisplayName?: string;
      title?: string;
    } = {};

    const suggestedCreator = formatCreatorDisplayName(username);
    if (suggestedCreator) {
      const currentCreator = this.form.controls.creatorDisplayName.value.trim();
      if (!currentCreator || currentCreator === this.lastAutoCreator) {
        patch.creatorDisplayName = suggestedCreator;
        this.lastAutoCreator = suggestedCreator;
      }
    }

    const suggestedTitle = suggestTitleFromTikTok(username);
    if (suggestedTitle) {
      const currentTitle = this.form.controls.title.value.trim();
      if (!currentTitle || currentTitle === this.lastAutoTitle) {
        patch.title = suggestedTitle;
        this.lastAutoTitle = suggestedTitle;
      }
    }

    if (Object.keys(patch).length > 0) {
      this.form.patchValue(patch, { emitEvent: false });
    }
  }

  private applyOEmbedAutofill(metadata: TikTokVideoMetadata): void {
    const patch: {
      description?: string;
      creatorDisplayName?: string;
      title?: string;
    } = {};

    const caption = metadata.caption?.trim();
    if (caption) {
      const currentDescription = this.form.controls.description.value.trim();
      if (!currentDescription || currentDescription === this.lastAutoDescription) {
        patch.description = caption;
        this.lastAutoDescription = caption;
      }
    }

    const handle = metadata.authorUniqueId || null;
    const suggestedCreator = formatCreatorDisplayName(handle);
    if (suggestedCreator) {
      const currentCreator = this.form.controls.creatorDisplayName.value.trim();
      if (!currentCreator || currentCreator === this.lastAutoCreator) {
        patch.creatorDisplayName = suggestedCreator;
        this.lastAutoCreator = suggestedCreator;
      }
    }

    const suggestedTitle = suggestTitleFromTikTok(handle);
    if (suggestedTitle) {
      const currentTitle = this.form.controls.title.value.trim();
      if (!currentTitle || currentTitle === this.lastAutoTitle) {
        patch.title = suggestedTitle;
        this.lastAutoTitle = suggestedTitle;
      }
    }

    if (Object.keys(patch).length > 0) {
      this.form.patchValue(patch, { emitEvent: false });
    }
  }

  private createStepGroup(
    order: number,
    values?: {
      id?: string;
      title?: string;
      description?: string;
      startSeconds?: number;
      endSeconds?: number;
      durationSeconds?: number | null;
      autoAdvance?: boolean;
      loopVideo?: boolean;
    },
  ) {
    return this.fb.nonNullable.group({
      id: [values?.id ?? ''],
      order: [order],
      kind: ['step'],
      title: [values?.title ?? '', [Validators.required]],
      description: [values?.description ?? ''],
      startSeconds: [values?.startSeconds ?? 0, [Validators.required, Validators.min(0)]],
      endSeconds: [values?.endSeconds ?? 5, [Validators.required, Validators.min(0)]],
      durationSeconds: [values?.durationSeconds ?? (null as number | null)],
      autoAdvance: [values?.autoAdvance ?? true],
      loopVideo: [values?.loopVideo ?? true],
    });
  }

  private createGapGroup(
    order: number,
    values?: { id?: string; durationSeconds?: number | null; message?: string },
  ) {
    return this.fb.nonNullable.group({
      id: [values?.id ?? ''],
      order: [order],
      kind: ['gap'],
      durationSeconds: [
        values?.durationSeconds ?? DEFAULT_GAP_SECONDS,
        [
          Validators.required,
          Validators.min(GAP_SECONDS_MIN),
          Validators.max(GAP_SECONDS_MAX),
        ],
      ],
      message: [values?.message ?? '', [Validators.maxLength(GAP_MESSAGE_MAX_LENGTH)]],
    });
  }

  private renumberSteps(): void {
    this.steps.controls.forEach((control, index) => {
      control.patchValue({ order: index + 1 });
    });
  }

  private buildRequest(): CreateStepsItemRequest | UpdateStepsItemRequest | null {
    if (this.form.invalid) {
      return null;
    }

    const raw = this.form.getRawValue();
    const parsed = parseTikTokVideo(raw.videoInput);
    if (!parsed) {
      return null;
    }

    const username =
      raw.creatorDisplayName.replace(/^@/, '').trim() || parsed.username || null;
    const entries = raw.steps as StepEntryFormValue[];
    const steps = entries.map((entry, index) => {
      const order = index + 1;

      if (stepEntryKind(entry) === 'gap') {
        return {
          id: entry.id || null,
          order,
          kind: 'gap',
          title: null,
          description: null,
          startSeconds: 0,
          endSeconds: 0,
          durationSeconds: normaliseGapSeconds(Number(entry.durationSeconds)),
          autoAdvance: true,
          message: normaliseGapMessage(entry.message),
        };
      }

      const duration =
        entry.durationSeconds === null || entry.durationSeconds === ''
          ? null
          : Number(entry.durationSeconds);

      return {
        id: entry.id || null,
        order,
        kind: 'step',
        title: entry.title?.trim() ?? '',
        description: entry.description?.trim() || null,
        startSeconds: Number(entry.startSeconds),
        endSeconds: Number(entry.endSeconds),
        durationSeconds:
          duration != null && Number.isFinite(duration) && duration > 0 ? duration : null,
        autoAdvance: !!entry.autoAdvance,
        loopVideo: entry.loopVideo !== false,
        message: null,
      };
    });

    const activitySteps = steps.filter((s) => s.kind !== 'gap');
    if (activitySteps.length === 0) {
      return null;
    }
    if (activitySteps.some((s) => s.endSeconds <= s.startSeconds || !s.title)) {
      return null;
    }
    if (steps.some((s) => s.kind === 'gap' && s.durationSeconds === 0)) {
      return null;
    }

    // Locked fields keep their last values, so the lock decides what is saved.
    const rawGap = raw.noGaps ? null : (raw.gapSeconds as number | string | null);
    const parsedGap =
      rawGap === null || rawGap === ('' as unknown) ? NaN : Number(rawGap);
    const gapSeconds =
      Number.isFinite(parsedGap) && parsedGap > 0 ? Math.floor(parsedGap) : null;
    if (gapSeconds != null && (gapSeconds < 1 || gapSeconds > 600)) {
      return null;
    }
    const gapMessage =
      gapSeconds != null ? raw.gapMessage.trim().slice(0, 200) || null : null;
    const playGapPriorToStart = !!raw.playGapPriorToStart;
    const overrideStartGap = playGapPriorToStart && !!raw.overrideStartGap;
    const startGapSeconds = overrideStartGap
      ? parseOptionalGapSeconds(raw.startGapSeconds as number | string | null)
      : null;
    if (startGapSeconds != null && (startGapSeconds < 1 || startGapSeconds > 600)) {
      return null;
    }
    const startGapMessage = overrideStartGap
      ? String(raw.startGapMessage ?? '').trim().slice(0, 200) || null
      : null;

    return {
      title: raw.title.trim(),
      description: raw.description.trim() || null,
      creatorDisplayName: raw.creatorDisplayName.trim() || null,
      continuousSoundtrack: this.continuousSoundtrackEnabled
        ? !!raw.continuousSoundtrack
        : false,
      gapSeconds,
      gapMessage,
      playGapPriorToStart,
      startGapSeconds,
      startGapMessage,
      video: {
        provider: 'tiktok',
        externalVideoId: parsed.videoId,
        sourceUrl: buildTikTokSourceUrl(parsed.videoId, username),
        creatorUsername: username,
        durationSeconds: null,
      },
      steps,
    };
  }
}

function parseOptionalGapSeconds(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.floor(parsed);
}

function readVideoOnEnd(): boolean {
  try {
    return localStorage.getItem(LAYOUT_KEY) === '1';
  } catch {
    return false;
  }
}

function writeVideoOnEnd(value: boolean): void {
  try {
    localStorage.setItem(LAYOUT_KEY, value ? '1' : '0');
  } catch {
    // ignore
  }
}
