import { AsyncPipe } from '@angular/common';
import { Component, ViewChild, computed, inject, signal } from '@angular/core';
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
  finalize,
  map,
  merge,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { problemDetail } from '../../../../core/http-problem';
import { AnalyticsEvent } from '../../../../core/analytics/analytics-event';
import { AnalyticsService } from '../../../../core/analytics/analytics.service';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { MaterialModule } from '../../../../core/material.module';
import {
  StepPreviewRange,
  StepsEditorFormComponent,
} from '../../components/steps-editor-form/steps-editor-form.component';
import { StepsEditorPreviewComponent } from '../../components/steps-editor-preview/steps-editor-preview.component';
import {
  ApiStepsItem,
  CreateStepsItemRequest,
  UpdateStepsItemRequest,
} from '../../models/api-steps-item.model';
import { EDITOR_SECTIONS, EditorSectionId } from '../../models/editor-sections';
import {
  EditorEntryValue,
  mapEditorEntryToApiStep,
  nextStepClipWindow,
} from '../../models/editor-entry-request';
import { buildEditorCardPreview } from '../../models/editor-card-preview';
import {
  DEFAULT_CARD_BACKGROUND,
  DEFAULT_CARD_SECONDS,
  DEFAULT_CARD_TEXT,
  DEFAULT_GAP_SECONDS,
  DEFAULT_STEP_CLIP_SECONDS,
  DEFAULT_STEP_ENTRY_KIND,
  GAP_MESSAGE_MAX_LENGTH,
  GAP_SECONDS_MAX,
  GAP_SECONDS_MIN,
  CARD_SECONDS_MAX,
  CARD_SECONDS_MIN,
  REPEAT_COUNT_MAX,
  REPEAT_COUNT_MIN,
  StepEntryKind,
  activityCount,
  hasStartGapOverride,
  resolvedRepeatCount,
  stepEntryKind,
} from '../../models/step-entry';
import {
  DEFAULT_TIMING_BEEP_SECONDS,
  TIMING_BEEP_SECONDS_MAX,
  TIMING_BEEP_SECONDS_MIN,
  normalizeTimingBeepSeconds,
} from '../../models/timing-beep';
import { usesVideoContent } from '../../models/video-reference.model';
import {
  buildTikTokSourceUrl,
  canonicalTikTokShortUrl,
  formatCreatorDisplayName,
  importedTikTokHandle,
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

const LAYOUT_KEY = 'godu.editor.videoOnEnd';
const COLLAPSE_KEY = 'godu.editor.videoCollapsed';

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
  private lastAutoTitle = '';
  private lastAutoDescription = '';
  private lastTrackedVideoId: string | null = null;
  /** TikTok handle that locked the creator field, without @. */
  private importedCreatorHandle: string | null = null;

  readonly continuousSoundtrackEnabled = environment.features.continuousSoundtrack;
  readonly creatorLocked = signal(false);
  readonly editId$ = this.route.paramMap.pipe(map((p) => p.get('id')));
  readonly isEditMode = !!this.route.snapshot.paramMap.get('id');
  readonly goduId = toSignal(this.editId$, {
    initialValue: this.route.snapshot.paramMap.get('id'),
  });

  @ViewChild(StepsEditorPreviewComponent) private preview?: StepsEditorPreviewComponent;

  constructor() {
    if (!this.isEditMode) {
      this.analytics.trackOnce('create', AnalyticsEvent.CreateStarted);
    }
  }

  /** Desktop / landscape: when true, video column is on the end (right in LTR). */
  readonly videoOnEnd = signal(readVideoOnEnd());

  /** Portrait / stacked: when true, the preview is collapsed so the form can use the space. */
  readonly videoCollapsed = signal(readVideoCollapsed());

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
    noVideoContent: [false],
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
    repeatVideo: [false],
    repeatCount: [
      { value: REPEAT_COUNT_MIN as number | null, disabled: true },
      [Validators.required, Validators.min(REPEAT_COUNT_MIN), Validators.max(REPEAT_COUNT_MAX)],
    ],
    timingBeeps: [true],
    recommendedClipAudio: [true],
    recommendedVoiceCues: [false],
    timingBeepSeconds: [
      DEFAULT_TIMING_BEEP_SECONDS as number | null,
      [Validators.min(TIMING_BEEP_SECONDS_MIN), Validators.max(TIMING_BEEP_SECONDS_MAX)],
    ],
    steps: this.fb.array<FormGroup>([this.createStepGroup(1)]),
  });

  /** Keeps the gap fields locked in step with the checkbox for the component lifetime. */
  private readonly noVideoLock = toSignal(
    this.form.controls.noVideoContent.valueChanges.pipe(
      tap((noVideo) => this.applyNoVideoContent(noVideo)),
    ),
    { initialValue: false },
  );

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

  private readonly repeatLock = toSignal(
    this.form.controls.repeatVideo.valueChanges.pipe(
      tap((enabled) => this.applyRepeatVideo(enabled)),
    ),
    { initialValue: false },
  );

  private readonly timingBeepLock = toSignal(
    this.form.controls.timingBeeps.valueChanges.pipe(
      tap((enabled) => this.applyTimingBeeps(enabled)),
    ),
    { initialValue: true },
  );

  private readonly videoInputValue = toSignal(
    this.form.controls.videoInput.valueChanges.pipe(
      startWith(this.form.controls.videoInput.value),
    ),
    { initialValue: this.form.controls.videoInput.value },
  );

  private readonly resolvedVideoId = signal<string | null>(null);
  private videoLookupEpoch = 0;
  readonly videoLookupPending = signal(false);

  readonly previewVideoId = computed(() => {
    if (this.noVideoLock()) {
      return null;
    }
    const value = this.videoInputValue() ?? this.form.controls.videoInput.value;
    return parseTikTokVideo(value)?.videoId ?? this.resolvedVideoId();
  });

  readonly focusedEntryIndex = signal(0);

  readonly stepsSnapshot = toSignal(
    this.form.controls.steps.valueChanges.pipe(
      startWith(this.form.controls.steps.getRawValue()),
      map(() => this.steps.getRawValue() as EditorEntryValue[]),
    ),
    { initialValue: this.form.controls.steps.getRawValue() as EditorEntryValue[] },
  );

  private readonly entryFocus = toSignal(
    this.form.controls.steps.valueChanges.pipe(
      startWith(null),
      switchMap(() =>
        merge(
          ...this.steps.controls.map((control, index) =>
            control.valueChanges.pipe(map(() => index)),
          ),
        ),
      ),
      tap((index) => this.focusedEntryIndex.set(index)),
    ),
    { initialValue: 0 },
  );

  readonly editorCardPreview = computed(() => {
    this.entryFocus();
    if (this.previewVideoId()) {
      return null;
    }
    return buildEditorCardPreview(this.stepsSnapshot(), this.focusedEntryIndex());
  });

  /** Keeps autofill subscribed for the component lifetime. */
  private readonly videoAutofill = toSignal(
    this.form.controls.videoInput.valueChanges.pipe(
      tap((value) => {
        const canLookup = !!(parseTikTokVideo(value) || canonicalTikTokShortUrl(value));
        this.videoLookupEpoch += 1;
        this.videoLookupPending.set(canLookup);
        if (!canLookup) {
          this.resolvedVideoId.set(null);
        }
      }),
      debounceTime(350),
      distinctUntilChanged(),
      switchMap((value) => {
        if (this.form.controls.noVideoContent.value) {
          this.videoLookupPending.set(false);
          return of(null);
        }
        const parsed = parseTikTokVideo(value);
        const shortUrl = canonicalTikTokShortUrl(value);
        this.applyUrlAutofill(parsed?.username ?? null);
        const epoch = this.videoLookupEpoch;

        if (!parsed && !shortUrl) {
          this.unlockImportedCreator();
          this.resolvedVideoId.set(null);
          if (epoch === this.videoLookupEpoch) {
            this.videoLookupPending.set(false);
          }
          return of(null);
        }

        if (parsed) {
          this.resolvedVideoId.set(parsed.videoId);
        } else {
          this.resolvedVideoId.set(null);
        }

        const trackId = parsed?.videoId ?? shortUrl ?? '';
        const isNewSubmission = trackId !== this.lastTrackedVideoId;
        if (isNewSubmission) {
          this.lastTrackedVideoId = trackId;
          this.analytics.track(AnalyticsEvent.VideoUrlSubmitted, { platform: 'tiktok' });
        }

        const lookupKey = shortUrl ?? (value.trim().startsWith('http') ? value.trim() : parsed!.sourceUrl);
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
          finalize(() => {
            if (epoch === this.videoLookupEpoch) {
              this.videoLookupPending.set(false);
            }
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
            this.lastAutoTitle = '';
            this.lastAutoDescription = '';
            this.lastTrackedVideoId =
              parseTikTokVideo(item.video.sourceUrl || item.video.externalVideoId)?.videoId ?? null;
            const noGaps = (item.gapSeconds ?? 0) <= 0;
            const noVideo = !usesVideoContent(item);
            this.form.patchValue(
              {
                noVideoContent: noVideo,
                videoInput: noVideo ? '' : item.video.sourceUrl || item.video.externalVideoId,
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
                repeatVideo: resolvedRepeatCount(item) > 1,
                repeatCount:
                  resolvedRepeatCount(item) > 1
                    ? resolvedRepeatCount(item)
                    : REPEAT_COUNT_MIN,
                timingBeeps: (item.timingBeepSeconds ?? 0) > 0,
                timingBeepSeconds: item.timingBeepSeconds ?? DEFAULT_TIMING_BEEP_SECONDS,
                recommendedClipAudio: item.recommendedPlaybackSettings?.clipAudio ?? true,
                recommendedVoiceCues: item.recommendedPlaybackSettings?.voiceCues ?? false,
              },
              { emitEvent: true },
            );
            this.applyNoGaps(noGaps);
            this.applyNoVideoContent(noVideo);
            this.applyPlayGapPriorToStart(!!item.playGapPriorToStart && !noVideo);
            this.applyRepeatVideo(resolvedRepeatCount(item) > 1);
            this.applyTimingBeeps((item.timingBeepSeconds ?? 0) > 0);
            this.steps.clear();
            this.collapsedEntries.clear();
            for (const step of [...item.steps].sort((a, b) => a.order - b.order)) {
              const kind = stepEntryKind(step);
              const group =
                kind === 'gap'
                  ? this.createGapGroup(step.order, {
                      id: step.id,
                      durationSeconds: step.durationSeconds ?? DEFAULT_GAP_SECONDS,
                      message: step.message ?? '',
                    })
                  : kind === 'card'
                    ? this.createCardGroup(step.order, {
                        id: step.id,
                        durationSeconds: step.durationSeconds ?? DEFAULT_CARD_SECONDS,
                        message: step.message ?? '',
                        backgroundColor: step.backgroundColor ?? DEFAULT_CARD_BACKGROUND,
                        textColor: step.textColor ?? DEFAULT_CARD_TEXT,
                        stillSeconds: step.stillSeconds ?? null,
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
            const firstCard = [...item.steps]
              .sort((a, b) => a.order - b.order)
              .findIndex((step) => stepEntryKind(step) === 'card');
            this.focusedEntryIndex.set(firstCard >= 0 ? firstCard : 0);
            const imported =
              importedTikTokHandle(item.video.creatorUsername) ??
              importedTikTokHandle(
                parseTikTokVideo(item.video.sourceUrl || '')?.username,
              );
            if (imported) {
              this.lockImportedCreator(imported);
            } else {
              this.unlockImportedCreator();
            }
          }),
          map(() => ({ loading: false, error: null as string | null })),
          startWith({ loading: true, error: null as string | null }),
          catchError((err: unknown) =>
            of({
              loading: false,
              error: problemDetail(err, 'Could not load this Godu.'),
            }),
          ),
        );
      }),
    );

  readonly saveState$: Observable<EditorSaveState> = this.saveTrigger$.pipe(
    switchMap(() => {
      const request = this.buildRequest();
      if (!request) {
        return of({ saving: false, error: 'Check the title and that each step or card is complete.' });
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
            platform: saved.video.provider || 'none',
          });
          this.applySavedIds(saved);
          if (!id) {
            void this.router.navigate(['/my-steps', saved.id, 'edit'], { replaceUrl: true });
          }
        }),
        map(() => ({ saving: false, error: null as string | null })),
        startWith({ saving: true, error: null as string | null }),
        catchError((err: unknown) =>
          of({
            saving: false,
            error: problemDetail(err, 'Save failed.'),
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

  toggleVideoCollapsed(): void {
    const next = !this.videoCollapsed();
    this.videoCollapsed.set(next);
    writeVideoCollapsed(next);
    if (next) {
      this.preview?.pause();
    }
  }

  addEntry(kind: StepEntryKind = DEFAULT_STEP_ENTRY_KIND): void {
    const order = this.steps.length + 1;
    const resolved =
      !this.form.controls.noVideoContent.value || kind !== 'step' ? kind : 'card';
    const clip = resolved === 'step' ? nextStepClipWindow(this.steps.getRawValue()) : undefined;
    this.steps.push(this.createEntryGroup(resolved, order, clip));
    this.focusedEntryIndex.set(this.steps.length - 1);
    if (resolved === 'step' || resolved === 'card') {
      this.analytics.track(AnalyticsEvent.StepAdded, { stepNumber: this.activityStepCount });
    }
  }

  private applyNoVideoContent(noVideo: boolean): void {
    const videoInput = this.form.controls.videoInput;
    if (noVideo) {
      videoInput.clearValidators();
      videoInput.updateValueAndValidity({ emitEvent: false });
      this.form.controls.playGapPriorToStart.setValue(false, { emitEvent: true });
      this.form.controls.continuousSoundtrack.setValue(false, { emitEvent: false });
      this.videoLookupPending.set(false);
      this.replaceBlankStepWithCard();
      return;
    }
    videoInput.setValidators([Validators.required]);
    videoInput.updateValueAndValidity({ emitEvent: false });
  }

  private replaceBlankStepWithCard(): void {
    if (this.steps.length !== 1) {
      return;
    }
    const control = this.steps.at(0);
    const raw = control.getRawValue() as EditorEntryValue;
    if (stepEntryKind(raw) !== 'step' || raw.title?.trim()) {
      return;
    }
    this.collapsedEntries.delete(control);
    this.steps.setControl(
      0,
      this.createCardGroup(1, {
        id: raw.id,
        durationSeconds: DEFAULT_CARD_SECONDS,
        message: '',
      }),
    );
    this.focusedEntryIndex.set(0);
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

  private applyRepeatVideo(enabled: boolean): void {
    const { repeatCount } = this.form.controls;
    if (!enabled) {
      repeatCount.disable({ emitEvent: false });
      return;
    }
    const current = Number(repeatCount.value);
    if (!Number.isFinite(current) || current < REPEAT_COUNT_MIN) {
      repeatCount.setValue(REPEAT_COUNT_MIN, { emitEvent: false });
    }
    repeatCount.enable({ emitEvent: false });
  }

  private applyTimingBeeps(enabled: boolean): void {
    const { timingBeepSeconds } = this.form.controls;
    if (!enabled) {
      timingBeepSeconds.disable({ emitEvent: false });
      return;
    }
    if (timingBeepSeconds.value == null) {
      timingBeepSeconds.setValue(DEFAULT_TIMING_BEEP_SECONDS, { emitEvent: false });
    }
    timingBeepSeconds.enable({ emitEvent: false });
  }

  toggleSection(id: EditorSectionId): void {
    this.openSection.update((current) => (current === id ? null : id));
  }

  toggleEntry(index: number): void {
    const control = this.steps.at(index);
    if (!control) {
      return;
    }
    this.focusedEntryIndex.set(index);
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
    if (this.focusedEntryIndex() === previousIndex) {
      this.focusedEntryIndex.set(currentIndex);
    } else {
      const focused = this.focusedEntryIndex();
      if (previousIndex < focused && currentIndex >= focused) {
        this.focusedEntryIndex.set(focused - 1);
      } else if (previousIndex > focused && currentIndex <= focused) {
        this.focusedEntryIndex.set(focused + 1);
      }
    }
  }

  /** Gaps can always go; the last remaining activity step cannot. */
  canRemoveEntry(index: number): boolean {
    const entry = this.steps.at(index)?.getRawValue() as EditorEntryValue | undefined;
    if (!entry) {
      return false;
    }
    return stepEntryKind(entry) === 'gap' || this.activityStepCount > 1;
  }

  removeEntry(index: number): void {
    if (!this.canRemoveEntry(index)) {
      return;
    }
    const entry = this.steps.at(index)?.getRawValue() as EditorEntryValue | undefined;
    if (entry && stepEntryKind(entry) === 'step') {
      const entries = this.steps.getRawValue() as EditorEntryValue[];
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
    const focused = this.focusedEntryIndex();
    if (focused >= this.steps.length) {
      this.focusedEntryIndex.set(Math.max(0, this.steps.length - 1));
    } else if (focused > index) {
      this.focusedEntryIndex.set(focused - 1);
    }
  }

  get activityStepCount(): number {
    return activityCount(this.steps.getRawValue() as EditorEntryValue[]);
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.revealInvalidSection();
    this.expandInvalidEntries();
    this.saveTrigger$.next();
  }

  previewFrom(range: StepPreviewRange): void {
    this.preview?.playFrom(range.startSeconds, range.endSeconds, range.loop === true);
  }

  private applySavedIds(saved: ApiStepsItem): void {
    saved.steps.forEach((step, index) => {
      const control = this.steps.at(index);
      if (control && step.id) {
        control.patchValue({ id: step.id }, { emitEvent: false });
      }
    });
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

  /**
   * Once TikTok supplies a handle, pin it on the form so the Godu cannot be
   * re-credited to someone else.
   */
  private lockImportedCreator(username: string | null | undefined): void {
    const handle = importedTikTokHandle(username);
    const formatted = formatCreatorDisplayName(handle);
    if (!handle || !formatted) {
      return;
    }
    this.importedCreatorHandle = handle;
    this.creatorLocked.set(true);
    this.form.controls.creatorDisplayName.patchValue(formatted, { emitEvent: false });
  }

  private unlockImportedCreator(): void {
    this.importedCreatorHandle = null;
    this.creatorLocked.set(false);
  }

  private applyUrlAutofill(username: string | null): void {
    this.lockImportedCreator(username);

    const patch: {
      title?: string;
    } = {};

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
      videoInput?: string;
      description?: string;
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
    this.lockImportedCreator(handle);

    const suggestedTitle = suggestTitleFromTikTok(handle);
    if (suggestedTitle) {
      const currentTitle = this.form.controls.title.value.trim();
      if (!currentTitle || currentTitle === this.lastAutoTitle) {
        patch.title = suggestedTitle;
        this.lastAutoTitle = suggestedTitle;
      }
    }

    const resolvedId =
      metadata.externalVideoId?.trim() ||
      parseTikTokVideo(metadata.sourceUrl)?.videoId ||
      null;
    if (resolvedId) {
      this.resolvedVideoId.set(resolvedId);
      this.lastTrackedVideoId = resolvedId;
    }

    const currentInput = this.form.controls.videoInput.value.trim();
    if (canonicalTikTokShortUrl(currentInput) && metadata.sourceUrl) {
      patch.videoInput = metadata.sourceUrl;
    }

    if (Object.keys(patch).length > 0) {
      this.form.patchValue(patch, { emitEvent: false });
    }
  }

  private createEntryGroup(
    kind: StepEntryKind,
    order: number,
    clip?: { startSeconds: number; endSeconds: number },
  ) {
    if (kind === 'gap') {
      return this.createGapGroup(order);
    }
    if (kind === 'card') {
      return this.createCardGroup(order);
    }
    return this.createStepGroup(order, clip);
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
      endSeconds: [
        values?.endSeconds ?? DEFAULT_STEP_CLIP_SECONDS,
        [Validators.required, Validators.min(0)],
      ],
      durationSeconds: [values?.durationSeconds ?? (null as number | null)],
      autoAdvance: [values?.autoAdvance ?? true],
      loopVideo: [values?.loopVideo ?? true],
    });
  }

  private createCardGroup(
    order: number,
    values?: {
      id?: string;
      durationSeconds?: number | null;
      message?: string;
      backgroundColor?: string | null;
      textColor?: string | null;
      stillSeconds?: number | null;
    },
  ) {
    const still = values?.stillSeconds != null && Number.isFinite(values.stillSeconds);
    return this.fb.nonNullable.group({
      id: [values?.id ?? ''],
      order: [order],
      kind: ['card'],
      durationSeconds: [
        values?.durationSeconds ?? DEFAULT_CARD_SECONDS,
        [
          Validators.required,
          Validators.min(CARD_SECONDS_MIN),
          Validators.max(CARD_SECONDS_MAX),
        ],
      ],
      message: [values?.message ?? '', [Validators.maxLength(GAP_MESSAGE_MAX_LENGTH)]],
      backgroundColor: [values?.backgroundColor ?? DEFAULT_CARD_BACKGROUND],
      textColor: [values?.textColor ?? DEFAULT_CARD_TEXT],
      useStill: [still],
      stillSeconds: [still ? values?.stillSeconds ?? null : (null as number | null), [Validators.min(0)]],
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
    const useVideo = !raw.noVideoContent;
    const parsed = parseTikTokVideo(raw.videoInput);
    const videoId = parsed?.videoId ?? this.resolvedVideoId();
    if (useVideo && !videoId) {
      return null;
    }

    const username =
      importedTikTokHandle(this.importedCreatorHandle) ??
      importedTikTokHandle(raw.creatorDisplayName) ??
      importedTikTokHandle(parsed?.username);
    const steps = raw.steps.map((entry, index) =>
      mapEditorEntryToApiStep(entry, index, useVideo),
    );

    if (steps.some((step) => step == null)) {
      return null;
    }
    const mapped = steps.filter((step): step is NonNullable<typeof step> => step != null);

    const activitySteps = mapped.filter((s) => s.kind !== 'gap');
    if (activitySteps.length === 0) {
      return null;
    }
    if (
      activitySteps.some((s) => {
        if (s.kind === 'card') {
          return !s.durationSeconds;
        }
        return s.endSeconds <= s.startSeconds || !s.title;
      })
    ) {
      return null;
    }
    if (mapped.some((s) => (s.kind === 'gap' || s.kind === 'card') && s.durationSeconds === 0)) {
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
    const playGapPriorToStart = useVideo && !!raw.playGapPriorToStart;
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

    const repeatCount = raw.repeatVideo
      ? Math.floor(Number(raw.repeatCount))
      : null;
    if (
      raw.repeatVideo &&
      (!Number.isFinite(repeatCount) ||
        repeatCount! < REPEAT_COUNT_MIN ||
        repeatCount! > REPEAT_COUNT_MAX)
    ) {
      return null;
    }

    const timingBeepSeconds = raw.timingBeeps
      ? (normalizeTimingBeepSeconds(raw.timingBeepSeconds as number | null) ??
        DEFAULT_TIMING_BEEP_SECONDS)
      : null;

    return {
      title: raw.title.trim(),
      description: raw.description.trim() || null,
      creatorDisplayName: formatCreatorDisplayName(username),
      continuousSoundtrack:
        useVideo && this.continuousSoundtrackEnabled ? !!raw.continuousSoundtrack : false,
      gapSeconds,
      gapMessage,
      playGapPriorToStart,
      startGapSeconds,
      startGapMessage,
      repeatCount,
      timingBeepSeconds,
      recommendedPlaybackSettings: {
        clipAudio: !!raw.recommendedClipAudio,
        voiceCues: !!raw.recommendedVoiceCues,
        timingBeeps: !!raw.timingBeeps,
        timingBeepSeconds,
      },
      useVideoContent: useVideo,
      video: useVideo
        ? {
            provider: 'tiktok',
            externalVideoId: videoId!,
            sourceUrl: buildTikTokSourceUrl(videoId!, username),
            creatorUsername: username,
            durationSeconds: null,
          }
        : {
            provider: 'none',
            externalVideoId: '',
            sourceUrl: '',
            creatorUsername: username,
            durationSeconds: null,
          },
      steps: mapped,
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

function readVideoCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeVideoCollapsed(value: boolean): void {
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0');
  } catch {
    // ignore
  }
}
