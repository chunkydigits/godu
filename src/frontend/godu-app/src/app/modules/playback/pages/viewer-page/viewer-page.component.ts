import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
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
import { UserSettingsService } from '../../../settings/services/user-settings.service';

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
  private readonly userSettings = inject(UserSettingsService);
  private readonly wakeLock = inject(ScreenWakeLockService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('descriptionHost') private descriptionHost?: ElementRef<HTMLElement>;

  private pendingItem: StepsItem | null = null;
  private settingsIdleTimer: ReturnType<typeof setTimeout> | null = null;

  settingsOpen = false;
  descriptionMarquee = false;
  descriptionMarqueeDuration = '14s';

  readonly error$ = new BehaviorSubject<string | null>(null);
  readonly showVideo$ = this.preferences.showVideo$;
  readonly voiceCues$ = this.userSettings.voiceCues$;

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
          this.syncVoiceCuesToPlayback();
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
  readonly showVideoPane$ = this.playback.state$.pipe(
    map((s) => s.phase !== 'completed'),
    distinctUntilChanged(),
  );

  constructor() {
    this.playback.setUserMuted(this.preferences.muted);
    this.syncVoiceCuesToPlayback();
    this.preferences.voiceCues$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.syncVoiceCuesToPlayback());
    this.userSettings.hydrate().pipe(takeUntil(this.destroy$)).subscribe();

    this.playback.state$
      .pipe(
        map((s) => s.phase === 'playing' || s.phase === 'gap'),
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

    this.playback.state$
      .pipe(
        map((s) => s.phase === 'completed'),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe((completed) => {
        if (completed) {
          this.closeSettingsPanel();
        }
      });

    this.playback.state$
      .pipe(
        map((s) => (s.phase === 'gap' ? '' : (s.selectedStep?.description ?? ''))),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.descriptionMarquee = false;
        setTimeout(() => this.measureDescriptionMarquee());
      });
  }

  ngOnDestroy(): void {
    this.closeSettingsPanel();
    this.destroy$.next();
    this.destroy$.complete();
    void this.wakeLock.release();
    void this.playback.destroy();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.measureDescriptionMarquee();
  }

  usesContinuousSoundtrack(item: StepsItem): boolean {
    return isContinuousSoundtrackEnabled(item);
  }

  async onPlayerReady(player: ControllableVideoPlayer): Promise<void> {
    await this.playback.attachPlayer(player);
    if (!this.preferences.showVideo) {
      await this.playback.suspendVisualKeepSession();
    }
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
    this.onSettingsActivity();
  }

  onVoiceCuesChange(enabled: boolean): void {
    if (this.playback.snapshot.userMuted) {
      return;
    }
    this.userSettings.setUseVoiceCuesByDefault(enabled);
    this.onSettingsActivity();
  }

  onSoundChange(enabled: boolean): void {
    this.setMuted(!enabled);
    this.onSettingsActivity();
  }

  toggleMute(): void {
    this.setMuted(!this.playback.snapshot.userMuted);
  }

  toggleSettingsPanel(): void {
    if (this.settingsOpen) {
      this.closeSettingsPanel();
      return;
    }
    this.settingsOpen = true;
    this.onSettingsActivity();
  }

  onSettingsActivity(): void {
    if (!this.settingsOpen) {
      return;
    }
    this.clearSettingsIdle();
    this.settingsIdleTimer = setTimeout(() => this.closeSettingsPanel(), 2000);
  }

  start(): void {
    void this.playback.start();
  }

  selectStep(index: number): void {
    void this.playback.selectStep(index);
  }

  togglePause(state: PlaybackState): void {
    if (state.phase === 'playing' || state.phase === 'gap') {
      void this.playback.pause();
    } else if (state.phase === 'paused') {
      void this.playback.resume();
    }
  }

  isGap(state: PlaybackState): boolean {
    return state.phase === 'gap' || (state.phase === 'paused' && state.gapActive);
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

  private measureDescriptionMarquee(): void {
    const host = this.descriptionHost?.nativeElement;
    const text = host?.querySelector('.viewer__step-description-text') as HTMLElement | null;
    if (!host || !text) {
      if (this.descriptionMarquee) {
        this.descriptionMarquee = false;
        this.changeDetector.detectChanges();
      }
      return;
    }

    const overflows = text.scrollWidth > host.clientWidth + 4;
    const seconds = Math.min(36, Math.max(10, text.scrollWidth / 32));
    const duration = `${seconds}s`;
    if (this.descriptionMarquee === overflows && this.descriptionMarqueeDuration === duration) {
      return;
    }

    this.descriptionMarquee = overflows;
    this.descriptionMarqueeDuration = duration;
    this.changeDetector.detectChanges();
  }

  private setMuted(muted: boolean): void {
    this.preferences.setMuted(muted);
    this.playback.setUserMuted(muted);
    this.syncVoiceCuesToPlayback();
  }

  private syncVoiceCuesToPlayback(): void {
    this.playback.setVoiceCuesEnabled(
      this.userSettings.voiceCues && !this.playback.snapshot.userMuted,
    );
  }

  private closeSettingsPanel(): void {
    this.settingsOpen = false;
    this.clearSettingsIdle();
  }

  private clearSettingsIdle(): void {
    if (this.settingsIdleTimer != null) {
      clearTimeout(this.settingsIdleTimer);
      this.settingsIdleTimer = null;
    }
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

    if (snap.phase === 'gap' && snap.selectedIndex >= 0) {
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
