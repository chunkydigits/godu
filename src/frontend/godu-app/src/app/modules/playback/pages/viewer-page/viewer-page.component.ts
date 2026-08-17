import { AsyncPipe } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  Subject,
  catchError,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { MaterialModule } from '../../../../core/material.module';
import { ScreenWakeLockService } from '../../../../core/services/screen-wake-lock.service';
import { CompletionPanelComponent } from '../../components/completion-panel/completion-panel.component';
import { StepNavigatorComponent } from '../../components/step-navigator/step-navigator.component';
import { VideoHostComponent } from '../../components/video-host/video-host.component';
import { StepsItem } from '../../models/steps-item.model';
import { isContinuousSoundtrackEnabled } from '../../models/continuous-soundtrack.feature';
import { ControllableVideoPlayer } from '../../models/video-player.interface';
import { DemoStepsService } from '../../services/demo-steps.service';
import { MyStepsApiService } from '../../services/my-steps-api.service';
import {
  PlaybackState,
  StepPlaybackService,
} from '../../services/step-playback.service';
import { ViewerPreferencesService } from '../../services/viewer-preferences.service';

@Component({
  selector: 'app-viewer-page',
  imports: [
    PageTemplateComponent,
    MaterialModule,
    RouterLink,
    AsyncPipe,
    VideoHostComponent,
    StepNavigatorComponent,
    CompletionPanelComponent,
  ],
  providers: [StepPlaybackService],
  templateUrl: './viewer-page.component.html',
  styleUrl: './viewer-page.component.scss',
})
export class ViewerPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly demoSteps = inject(DemoStepsService);
  private readonly myStepsApi = inject(MyStepsApiService);
  private readonly playback = inject(StepPlaybackService);
  private readonly preferences = inject(ViewerPreferencesService);
  private readonly wakeLock = inject(ScreenWakeLockService);
  private readonly destroy$ = new Subject<void>();

  private pendingItem: StepsItem | null = null;

  readonly error$ = new BehaviorSubject<string | null>(null);
  readonly showVideo$ = this.preferences.showVideo$;

  readonly item$: Observable<StepsItem | null> = this.route.paramMap.pipe(
    map((params) => params.get('id')),
    switchMap((id) => {
      if (!id) {
        return of(null);
      }
      return this.resolveItem(id).pipe(
        tap((item) => {
          this.pendingItem = item;
          this.error$.next(null);
          this.playback.setUserMuted(this.preferences.muted);
          void this.playback.load(item);
        }),
        catchError((err: Error) => {
          this.error$.next(err.message || 'Steps item not found.');
          return of(null);
        }),
      );
    }),
    takeUntil(this.destroy$),
  );

  readonly related$: Observable<StepsItem[]> = this.item$.pipe(
    switchMap((item) => (item ? this.demoSteps.getRelatedByCreator(item) : of([]))),
  );

  readonly state$: Observable<PlaybackState> = this.playback.state$;

  constructor() {
    this.playback.state$
      .pipe(
        map((s) => s.phase === 'playing'),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe((playing) => {
        if (playing) {
          void this.wakeLock.request();
        } else {
          void this.wakeLock.release();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    void this.wakeLock.release();
    void this.playback.destroy();
  }

  usesContinuousSoundtrack(item: StepsItem): boolean {
    return isContinuousSoundtrackEnabled(item);
  }

  async onPlayerReady(player: ControllableVideoPlayer): Promise<void> {
    await this.playback.attachPlayer(player);
    await this.syncPlayerToState();
  }

  async onSoundtrackReady(player: ControllableVideoPlayer): Promise<void> {
    await this.playback.attachSoundtrackPlayer(player);
    await this.syncPlayerToState();
  }

  onShowVideoChange(show: boolean): void {
    this.preferences.setShowVideo(show);
    if (show) {
      this.playback.resumeVisualKeepSessionFromUserGesture();
    } else {
      void this.playback.suspendVisualKeepSession();
    }
  }

  toggleMute(): void {
    const next = !this.playback.snapshot.userMuted;
    this.preferences.setMuted(next);
    this.playback.setUserMuted(next);
  }

  start(): void {
    void this.playback.start();
  }

  selectStep(index: number): void {
    void this.playback.selectStep(index);
  }

  previous(): void {
    void this.playback.previous();
  }

  next(): void {
    void this.playback.next();
  }

  togglePause(state: PlaybackState): void {
    if (state.phase === 'playing') {
      void this.playback.pause();
    } else if (state.phase === 'paused') {
      void this.playback.resume();
    }
  }

  replay(): void {
    void this.playback.restart();
  }

  formatRemaining(seconds: number | null): string {
    if (seconds == null) {
      return 'Untimed';
    }
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  private resolveItem(id: string): Observable<StepsItem> {
    return this.demoSteps.getById(id).pipe(
      catchError(() =>
        this.myStepsApi.getAsStepsItem(id).pipe(
          catchError(() => {
            throw new Error(`Steps item not found: ${id}`);
          }),
        ),
      ),
    );
  }

  private async syncPlayerToState(): Promise<void> {
    const snap = this.playback.snapshot;
    if (snap.phase === 'playing' && snap.selectedIndex >= 0) {
      this.playback.resumeVisualKeepSessionFromUserGesture();
      return;
    }

    if (snap.phase === 'ready' && snap.selectedIndex >= 0) {
      await this.playback.selectStep(snap.selectedIndex, { activate: false });
      return;
    }

    if (snap.phase === 'paused' && snap.selectedIndex >= 0) {
      this.playback.resumeVisualKeepSessionFromUserGesture();
      return;
    }

    if (this.pendingItem && !snap.stepsItem) {
      await this.playback.load(this.pendingItem);
    }
  }
}
