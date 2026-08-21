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
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
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
  throwError,
} from 'rxjs';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { MaterialModule } from '../../../../core/material.module';
import { ScreenWakeLockService } from '../../../../core/services/screen-wake-lock.service';
import { CompletionPanelComponent } from '../../components/completion-panel/completion-panel.component';
import { StepNavigatorComponent } from '../../components/step-navigator/step-navigator.component';
import { VideoHostComponent } from '../../components/video-host/video-host.component';
import { StepDefinition } from '../../models/step-definition.model';
import { StepsItem } from '../../models/steps-item.model';
import { activityEntries } from '../../models/step-entry';
import {
  TikTokCreatorLink,
  creatorLabel,
  tiktokCreatorLink,
} from '../../models/creator-link';
import { isContinuousSoundtrackEnabled } from '../../models/continuous-soundtrack.feature';
import { ControllableVideoPlayer } from '../../models/video-player.interface';
import { DemoStepsService } from '../../services/demo-steps.service';
import { MyStepsApiService } from '../../services/my-steps-api.service';
import { PlayHistoryService } from '../../services/play-history.service';
import { PublicStepsApiService } from '../../services/public-steps-api.service';
import {
  PlaybackState,
  StepPlaybackService,
} from '../../services/step-playback.service';
import { ViewerPreferencesService } from '../../services/viewer-preferences.service';
import { UserSettingsService } from '../../../settings/services/user-settings.service';
import { viewerBackPathFromUrl, shouldReplaceCanonicalPath } from '../../models/public-path';
import { StepsVisibility } from '../../models/steps-visibility.enum';
import { AnalyticsEvent } from '../../../../core/analytics/analytics-event';
import { AnalyticsService } from '../../../../core/analytics/analytics.service';

@Component({
  selector: 'app-viewer-page',
  imports: [
    PageTemplateComponent,
    MaterialModule,
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
  private readonly router = inject(Router);
  private readonly demoSteps = inject(DemoStepsService);
  private readonly myStepsApi = inject(MyStepsApiService);
  private readonly publicStepsApi = inject(PublicStepsApiService);
  private readonly playHistory = inject(PlayHistoryService);
  private readonly playback = inject(StepPlaybackService);
  private readonly preferences = inject(ViewerPreferencesService);
  private readonly userSettings = inject(UserSettingsService);
  private readonly wakeLock = inject(ScreenWakeLockService);
  private readonly analytics = inject(AnalyticsService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();
  private startedAtMs: number | null = null;
  private lastPlayingStep: number | null = null;
  private lastCompletedStep: number | null = null;

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
    switchMap((params) =>
      this.resolveItem(params).pipe(
        tap((item) => {
          this.pendingItem = item;
          this.lastPlayingStep = null;
          this.lastCompletedStep = null;
          this.error$.next(null);
          this.playback.setUserMuted(this.preferences.muted);
          this.syncVoiceCuesToPlayback();
          this.trackViewed(item);
          void this.playback.load(item);
          if (shouldReplaceCanonicalPath(this.router.url, item.publicPath)) {
            void this.router.navigateByUrl(item.publicPath!, { replaceUrl: true });
          }
        }),
        catchError((err: Error) => {
          this.error$.next(err.message || 'Steps item not found.');
          return of(null);
        }),
      ),
    ),
    takeUntil(this.destroy$),
  );

  readonly related$: Observable<StepsItem[]> = this.item$.pipe(
    switchMap((item) => (item ? this.resolveRelated(item) : of([]))),
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
          this.trackCompleted();
        }
      });

    this.playback.state$
      .pipe(
        map((s) => ({
          phase: s.phase,
          stepNumber: s.stepNumber,
          remainingSeconds: s.remainingSeconds,
        })),
        distinctUntilChanged(
          (a, b) =>
            a.phase === b.phase &&
            a.stepNumber === b.stepNumber &&
            a.remainingSeconds === b.remainingSeconds,
        ),
        takeUntil(this.destroy$),
      )
      .subscribe(({ phase, stepNumber, remainingSeconds }) => {
        const item = this.playback.snapshot.stepsItem;
        if (!item) {
          return;
        }

        if (phase === 'ready' || phase === 'idle') {
          this.lastPlayingStep = null;
          this.lastCompletedStep = null;
          return;
        }

        const totalSteps = activityEntries(item.steps).length;
        if (
          this.lastPlayingStep != null &&
          stepNumber != null &&
          stepNumber > this.lastPlayingStep
        ) {
          this.trackStepCompleted(item, this.lastPlayingStep, totalSteps);
        }

        if (
          this.lastPlayingStep != null &&
          remainingSeconds === 0 &&
          phase !== 'gap'
        ) {
          this.trackStepCompleted(item, this.lastPlayingStep, totalSteps);
        }

        if (phase === 'playing' && stepNumber != null) {
          if (this.lastPlayingStep !== stepNumber) {
            this.analytics.track(AnalyticsEvent.StepStarted, {
              ...this.goduProps(item),
              stepNumber,
              totalSteps,
            });
          }
          this.lastPlayingStep = stepNumber;
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

  creatorLink(item: StepsItem): TikTokCreatorLink | null {
    return tiktokCreatorLink(item);
  }

  creatorLabel(item: StepsItem): string {
    return creatorLabel(item);
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
    setTimeout(() => this.measureDescriptionMarquee());
  }

  onVoiceCuesChange(enabled: boolean): void {
    if (this.playback.snapshot.userMuted) {
      return;
    }
    this.userSettings.setUseVoiceCuesByDefault(enabled);
    this.syncVoiceCuesToPlayback();
    if (enabled) {
      this.playback.unlockVoiceCuesFromUserGesture();
    }
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
    const item = this.playback.snapshot.stepsItem;
    if (item) {
      this.startedAtMs = Date.now();
      this.analytics.trackOnce(`started:${item.id}`, AnalyticsEvent.GoduStarted, this.goduProps(item));
      this.playHistory.record(item, 'started');
    }
    void this.playback.start();
  }

  /** Activity steps only; gaps are not listed in the navigator. */
  activitySteps(item: StepsItem): StepDefinition[] {
    return activityEntries(item.steps);
  }

  selectActivityStep(activityIndex: number): void {
    const current = Math.max(0, (this.playback.snapshot.stepNumber ?? 1) - 1);
    const item = this.playback.snapshot.stepsItem;
    if (item && activityIndex !== current) {
      const event =
        activityIndex > current ? AnalyticsEvent.NextStepClicked : AnalyticsEvent.PreviousStepClicked;
      this.analytics.track(event, {
        ...this.goduProps(item),
        fromStep: current + 1,
        toStep: activityIndex + 1,
      });
    } else if (item && activityIndex === current) {
      this.analytics.track(AnalyticsEvent.StepRepeated, {
        ...this.goduProps(item),
        stepNumber: activityIndex + 1,
      });
    }
    void this.playback.selectActivityStep(activityIndex);
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
    this.startedAtMs = Date.now();
    this.lastPlayingStep = null;
    this.lastCompletedStep = null;
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

  private resolveItem(params: ParamMap): Observable<StepsItem> {
    const id = params.get('id');
    if (id) {
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

    const username = params.get('username');
    const slug = params.get('slug');
    const provider = this.route.snapshot.data['provider'] as string | undefined;
    if (username && slug && provider) {
      return this.publicStepsApi.getAsStepsItem(provider, username, slug).pipe(
        catchError(() => {
          throw new Error('This public Steps page was not found.');
        }),
      );
    }

    return throwError(() => new Error('Steps item not found.'));
  }

  private resolveRelated(item: StepsItem): Observable<StepsItem[]> {
    const provider = item.video.provider;
    const username = item.video.creatorUsername;
    const slug = item.slug;
    const isPublic =
      item.visibility === StepsVisibility.Public ||
      !!this.route.snapshot.paramMap.get('slug');

    if (isPublic && provider && username && slug) {
      return this.publicStepsApi.getRelatedAsStepsItems(provider, username, slug).pipe(
        catchError(() => of([])),
      );
    }

    return this.demoSteps.getRelatedByCreator(item);
  }

  backLink(): string {
    return viewerBackPathFromUrl(this.router.url, (id) => this.demoSteps.isDemo(id));
  }

  goBack(): void {
    void this.router.navigateByUrl(this.backLink());
  }

  private trackViewed(item: StepsItem): void {
    this.analytics.trackOnce(`viewed:${item.id}`, AnalyticsEvent.GoduViewed, {
      ...this.goduProps(item),
      owner: !this.route.snapshot.paramMap.get('username'),
      stepCount: activityEntries(item.steps).length,
      visibility: item.visibility,
    });
  }

  private trackCompleted(): void {
    const item = this.playback.snapshot.stepsItem;
    if (!item) {
      return;
    }

    const totalSteps = activityEntries(item.steps).length;
    if (this.lastPlayingStep != null) {
      this.trackStepCompleted(item, this.lastPlayingStep, totalSteps);
    }

    const elapsedSeconds =
      this.startedAtMs == null ? undefined : Math.max(0, Math.round((Date.now() - this.startedAtMs) / 1000));
    this.analytics.trackOnce(`completed:${item.id}`, AnalyticsEvent.GoduCompleted, {
      ...this.goduProps(item),
      stepCount: totalSteps,
      elapsedSeconds,
    });
    this.playHistory.record(item, 'completed');
  }

  private trackStepCompleted(item: StepsItem, stepNumber: number, totalSteps: number): void {
    if (this.lastCompletedStep === stepNumber) {
      return;
    }

    this.lastCompletedStep = stepNumber;
    this.analytics.track(AnalyticsEvent.StepCompleted, {
      ...this.goduProps(item),
      stepNumber,
      totalSteps,
    });
  }

  private goduProps(item: StepsItem): { goduId: string; platform: string | null } {
    return {
      goduId: item.id,
      platform: item.video.provider ?? 'tiktok',
    };
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
