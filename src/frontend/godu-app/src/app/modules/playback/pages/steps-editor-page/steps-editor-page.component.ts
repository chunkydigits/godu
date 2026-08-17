import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
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
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { MaterialModule } from '../../../../core/material.module';
import { StepsEditorFormComponent } from '../../components/steps-editor-form/steps-editor-form.component';
import { StepsEditorPreviewComponent } from '../../components/steps-editor-preview/steps-editor-preview.component';
import {
  CreateStepsItemRequest,
  UpdateStepsItemRequest,
} from '../../models/api-steps-item.model';
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

  private readonly saveTrigger$ = new Subject<void>();

  /** Last values written by URL autofill — do not overwrite user edits. */
  private lastAutoCreator = '';
  private lastAutoTitle = '';
  private lastAutoDescription = '';

  readonly continuousSoundtrackEnabled = environment.features.continuousSoundtrack;
  readonly editId$ = this.route.paramMap.pipe(map((p) => p.get('id')));
  readonly isEditMode = !!this.route.snapshot.paramMap.get('id');

  /** Desktop: when true, video column is on the end (right in LTR). */
  readonly videoOnEnd = signal(readVideoOnEnd());

  readonly form = this.fb.nonNullable.group({
    videoInput: ['', [Validators.required]],
    title: ['', [Validators.required, Validators.minLength(1)]],
    description: [''],
    creatorDisplayName: [''],
    continuousSoundtrack: [false],
    steps: this.fb.array([this.createStepGroup(1)]),
  });

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

        const lookupKey = value.trim().startsWith('http') ? value.trim() : parsed.sourceUrl;
        return this.myStepsApi.lookupTikTokMetadata(lookupKey).pipe(
          tap((metadata) => this.applyOEmbedAutofill(metadata)),
          catchError(() => of(null)),
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
            this.form.patchValue(
              {
                videoInput: item.video.sourceUrl || item.video.externalVideoId,
                title: item.title,
                description: item.description ?? '',
                creatorDisplayName: item.creatorDisplayName ?? '',
                continuousSoundtrack: item.continuousSoundtrack,
              },
              { emitEvent: true },
            );
            this.steps.clear();
            for (const step of [...item.steps].sort((a, b) => a.order - b.order)) {
              this.steps.push(
                this.createStepGroup(step.order, {
                  id: step.id,
                  title: step.title,
                  description: step.description ?? '',
                  startSeconds: step.startSeconds,
                  endSeconds: step.endSeconds,
                  durationSeconds: step.durationSeconds ?? null,
                  autoAdvance: step.autoAdvance,
                }),
              );
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

  addStep(): void {
    this.steps.push(this.createStepGroup(this.steps.length + 1));
  }

  removeStep(index: number): void {
    if (this.steps.length <= 1) {
      return;
    }
    this.steps.removeAt(index);
    this.renumberSteps();
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.saveTrigger$.next();
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
    },
  ) {
    return this.fb.nonNullable.group({
      id: [values?.id ?? ''],
      order: [order],
      title: [values?.title ?? '', [Validators.required]],
      description: [values?.description ?? ''],
      startSeconds: [values?.startSeconds ?? 0, [Validators.required, Validators.min(0)]],
      endSeconds: [values?.endSeconds ?? 5, [Validators.required, Validators.min(0)]],
      durationSeconds: [values?.durationSeconds ?? (null as number | null)],
      autoAdvance: [values?.autoAdvance ?? true],
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
    const steps = raw.steps.map((step, index) => {
      const duration =
        step.durationSeconds === null || step.durationSeconds === ('' as unknown)
          ? null
          : Number(step.durationSeconds);

      return {
        id: step.id || null,
        order: index + 1,
        title: step.title.trim(),
        description: step.description.trim() || null,
        startSeconds: Number(step.startSeconds),
        endSeconds: Number(step.endSeconds),
        durationSeconds:
          Number.isFinite(duration as number) && (duration as number) > 0
            ? (duration as number)
            : null,
        autoAdvance: !!step.autoAdvance,
      };
    });

    if (steps.some((s) => s.endSeconds <= s.startSeconds || !s.title)) {
      return null;
    }

    return {
      title: raw.title.trim(),
      description: raw.description.trim() || null,
      creatorDisplayName: raw.creatorDisplayName.trim() || null,
      continuousSoundtrack: this.continuousSoundtrackEnabled
        ? !!raw.continuousSoundtrack
        : false,
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
