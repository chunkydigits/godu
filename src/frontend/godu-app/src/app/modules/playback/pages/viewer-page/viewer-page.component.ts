import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  inject,
  viewChild,
} from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap,
  throwError,
} from 'rxjs';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { problemDetail } from '../../../../core/http-problem';
import { MaterialModule } from '../../../../core/material.module';
import { ShareGoduService } from '../../services/share-godu.service';
import { ScreenWakeLockService } from '../../../../core/services/screen-wake-lock.service';
import { CompletionPanelComponent } from '../../components/completion-panel/completion-panel.component';
import { InstructionCardComponent } from '../../components/instruction-card/instruction-card.component';
import { SaveGoduButtonComponent } from '../../components/save-godu-button/save-godu-button.component';
import { StepNavigatorComponent } from '../../components/step-navigator/step-navigator.component';
import { VideoHostComponent } from '../../components/video-host/video-host.component';
import {
  countdownProgress,
  countdownUsesMinutes,
  formatCompactDuration,
  formatCountdown,
} from '../../models/duration';
import { StepDefinition } from '../../models/step-definition.model';
import { StepsItem } from '../../models/steps-item.model';
import {
  activityDisplayTitle,
  activityEntries,
  hasMoreIterations,
  hasPreviousIteration,
  hasTimedActivity,
  isOnFinalStep,
  iterationCaption as formatIterationCaption,
  resolvedRepeatCount,
  stillCardOverlay,
  visibleInstructionCard,
  shouldLoopVideo,
} from '../../models/step-entry';
import { usesVideoContent } from '../../models/video-reference.model';
import { TikTokCreatorLink, creatorLabel, tiktokCreatorLink } from '../../models/creator-link';
import { isContinuousSoundtrackEnabled } from '../../models/continuous-soundtrack.feature';
import { ControllableVideoPlayer } from '../../models/video-player.interface';
import { DemoStepsService } from '../../services/demo-steps.service';
import { MyStepsApiService } from '../../services/my-steps-api.service';
import { PlayHistoryService } from '../../services/play-history.service';
import { PublicStepsApiService } from '../../services/public-steps-api.service';
import { PlaybackState, StepPlaybackService } from '../../services/step-playback.service';
import { ViewerPreferencesService } from '../../services/viewer-preferences.service';
import { UserSettingsService } from '../../../settings/services/user-settings.service';
import {
  DEFAULT_TIMING_BEEP_SECONDS,
  TIMING_BEEP_SECONDS_MAX,
  TIMING_BEEP_SECONDS_MIN,
  normalizeTimingBeepSeconds,
  resolveTimingBeepSeconds,
} from '../../models/timing-beep';
import { viewerBackPathFromUrl, shouldReplaceCanonicalPath } from '../../models/public-path';
import { StepsVisibility } from '../../models/steps-visibility.enum';
import { AnalyticsEvent } from '../../../../core/analytics/analytics-event';
import { AnalyticsService } from '../../../../core/analytics/analytics.service';
import { SavedGodusService } from '../../services/saved-godus.service';

interface ViewerLoadView {
  loading: boolean;
  item: StepsItem | null;
  error: string | null;
}

@Component({
  selector: 'app-viewer-page',
  imports: [
    PageTemplateComponent,
    MaterialModule,
    AsyncPipe,
    NgTemplateOutlet,
    VideoHostComponent,
    StepNavigatorComponent,
    CompletionPanelComponent,
    InstructionCardComponent,
    SaveGoduButtonComponent,
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
  private readonly savedGodus = inject(SavedGodusService);
  private readonly shareGodu = inject(ShareGoduService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();
  private lastPlayingStep: number | null = null;
  private lastCompletedStep: number | null = null;

  @ViewChild('descriptionHost') private descriptionHost?: ElementRef<HTMLElement>;
  private readonly settingsDrawer = viewChild<MatSidenav>('settingsDrawer');
  private readonly stepsListDrawer = viewChild<MatSidenav>('stepsListDrawer');

  private pendingItem: StepsItem | null = null;

  settingsOpen = false;
  stepsListOpen = false;
  shareCopied = false;
  descriptionMarquee = false;
  descriptionMarqueeDuration = '14s';
  private shareCopiedTimer: ReturnType<typeof setTimeout> | null = null;

  readonly showVideo$ = this.preferences.showVideo$;
  readonly leftHanded$ = this.preferences.leftHanded$;
  readonly clipAudio$ = this.preferences.clipAudio$;
  readonly voiceCues$ = this.userSettings.voiceCues$;
  readonly showIteration$ = this.preferences.showIteration$;
  readonly timingBeeps$ = this.preferences.timingBeeps$;
  readonly timingBeepSecondsMin = TIMING_BEEP_SECONDS_MIN;
  readonly timingBeepSecondsMax = TIMING_BEEP_SECONDS_MAX;

  readonly view$: Observable<ViewerLoadView> = this.route.paramMap.pipe(
    switchMap((params) =>
      this.resolveItem(params).pipe(
        tap((item) => {
          this.pendingItem = item;
          this.lastPlayingStep = null;
          this.lastCompletedStep = null;
          this.shareCopied = false;
          this.playback.setUserMuted(this.preferences.muted);
          this.playback.setClipAudioEnabled(this.preferences.clipAudio);
          this.syncVoiceCuesToPlayback();
          this.syncTimingBeepsToPlayback();
          this.trackViewed(item);
          if (
            this.playback.snapshot.stepsItem?.id === item.id &&
            this.playback.snapshot.phase === 'completed'
          ) {
            return;
          }
          void this.playback.load(item);
          if (shouldReplaceCanonicalPath(this.router.url, item.publicPath)) {
            void this.router.navigateByUrl(item.publicPath!, { replaceUrl: true });
          }
        }),
        map((item) => ({ loading: false, item, error: null as string | null })),
        startWith({ loading: true, item: null, error: null as string | null }),
        catchError((err: unknown) =>
          of({
            loading: false,
            item: null,
            error: problemDetail(err, 'This Godu is not available.'),
          }),
        ),
      ),
    ),
    takeUntil(this.destroy$),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly related$: Observable<StepsItem[]> = this.view$.pipe(
    switchMap((view) => (view.item ? this.resolveRelated(view.item) : of([]))),
  );

  readonly state$: Observable<PlaybackState> = this.playback.state$;
  readonly showVideoPane$ = this.playback.state$.pipe(
    map((s) => s.phase !== 'completed'),
    distinctUntilChanged(),
  );

  constructor() {
    this.playback.setUserMuted(this.preferences.muted);
    this.playback.setClipAudioEnabled(this.preferences.clipAudio);
    this.syncVoiceCuesToPlayback();
    this.syncTimingBeepsToPlayback();
    this.preferences.clipAudio$
      .pipe(takeUntil(this.destroy$))
      .subscribe((enabled) => this.playback.setClipAudioEnabled(enabled));
    this.preferences.voiceCues$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.syncVoiceCuesToPlayback());
    this.preferences.timingBeeps$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.syncTimingBeepsToPlayback());
    this.preferences.timingBeepSeconds$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.syncTimingBeepsToPlayback());
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

        if (this.lastPlayingStep != null && remainingSeconds === 0 && phase !== 'gap') {
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
    if (this.shareCopiedTimer) {
      clearTimeout(this.shareCopiedTimer);
    }
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

  hasVideo(item: StepsItem): boolean {
    return usesVideoContent(item);
  }

  startHint(item: StepsItem, state: PlaybackState): string {
    if (state.userMuted) {
      return 'Starts with all sound off.';
    }
    if (this.hasVideo(item) && this.preferences.showVideo) {
      const extras = [
        this.userSettings.voiceCues ? 'spoken step names' : null,
        this.preferences.timingBeeps ? 'beeps' : null,
      ].filter((part): part is string => part != null);
      const extraPhrase =
        extras.length === 0
          ? ''
          : extras.length === 1
            ? extras[0]
            : `${extras[0]} and ${extras[1]}`;
      if (!this.preferences.clipAudio) {
        return extraPhrase
          ? `Starts the video muted, with ${extraPhrase}.`
          : 'Starts the video muted.';
      }
      if (extraPhrase) {
        return `Starts the video with ${extraPhrase}.`;
      }
      if (this.usesContinuousSoundtrack(item)) {
        return 'Starts muted step clips with a continuous soundtrack.';
      }
      return 'Starts the video and step timer together.';
    }
    if (this.hasVideo(item)) {
      return 'Starts the step timer (video is off).';
    }
    return 'Starts the card and step timers.';
  }

  stepTitle(step: StepDefinition | null | undefined): string {
    return step ? activityDisplayTitle(step) : '—';
  }

  instructionCard(state: PlaybackState): StepDefinition | null {
    return visibleInstructionCard(state.selectedStep, this.isGap(state));
  }

  stillOverlay(state: PlaybackState): StepDefinition | null {
    return stillCardOverlay(state.selectedStep, this.isGap(state));
  }

  instructionCardPreview(state: PlaybackState): boolean {
    return this.isGap(state);
  }

  showVideoHost(item: StepsItem, state: PlaybackState): boolean {
    if (!this.hasVideo(item) || this.instructionCard(state)) {
      return false;
    }
    return true;
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
    setTimeout(() => this.measureDescriptionMarquee());
  }

  onClipAudioChange(enabled: boolean): void {
    this.preferences.setClipAudio(enabled);
    this.playback.setClipAudioEnabled(enabled);
    this.saveCurrentGoduSettings();
  }

  onVoiceCuesChange(enabled: boolean): void {
    this.preferences.setVoiceCues(enabled);
    this.syncVoiceCuesToPlayback();
    this.saveCurrentGoduSettings();
    if (enabled) {
      this.playback.unlockVoiceCuesFromUserGesture();
    }
  }

  onTimingBeepsChange(enabled: boolean): void {
    this.preferences.setTimingBeeps(enabled);
    this.syncTimingBeepsToPlayback();
    this.saveCurrentGoduSettings();
    if (enabled) {
      this.playback.unlockVoiceCuesFromUserGesture();
    }
  }

  onTimingBeepSecondsChange(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    if (raw.trim() === '') {
      this.preferences.setTimingBeepSeconds(null);
      this.syncTimingBeepsToPlayback();
      this.saveCurrentGoduSettings();
      return;
    }
    const parsed = Number(raw);
    const seconds = normalizeTimingBeepSeconds(parsed);
    if (seconds == null) {
      const clamped = Number.isFinite(parsed)
        ? Math.min(TIMING_BEEP_SECONDS_MAX, Math.max(TIMING_BEEP_SECONDS_MIN, Math.floor(parsed)))
        : DEFAULT_TIMING_BEEP_SECONDS;
      this.preferences.setTimingBeepSeconds(clamped);
    } else {
      this.preferences.setTimingBeepSeconds(seconds);
    }
    this.syncTimingBeepsToPlayback();
    this.saveCurrentGoduSettings();
  }

  timingBeepSecondsDisplay(item: StepsItem): number {
    return (
      resolveTimingBeepSeconds({
        goduSeconds: item.timingBeepSeconds,
        userEnabled: true,
        userSeconds: this.preferences.timingBeepSeconds,
      }) ?? DEFAULT_TIMING_BEEP_SECONDS
    );
  }

  onMuteAllChange(muted: boolean): void {
    this.setMuted(muted);
  }

  onLoopAllChange(enabled: boolean): void {
    this.playback.setLoopAll(enabled);
    if (enabled) {
      this.startLoopingClipIfPlaying();
    }
  }

  clipLoops(state: PlaybackState): boolean {
    if (!state.selectedStep) {
      return false;
    }
    return shouldLoopVideo(state.selectedStep, state.loopAll, state.loopOverride);
  }

  showLoopToggle(item: StepsItem, state: PlaybackState): boolean {
    return this.hasVideo(item) && !this.isGap(state) && !this.instructionCard(state);
  }

  toggleLoop(state: PlaybackState): void {
    const looping = this.clipLoops(state);
    this.playback.setLoopOverride(!looping);
    if (!looping) {
      this.startLoopingClipIfPlaying();
    }
  }

  private startLoopingClipIfPlaying(): void {
    if (this.playback.snapshot.clipHoldActive) {
      void this.playback.replayCurrentClip();
      return;
    }
    this.playback.restartClipLoopFromUserGesture();
  }

  onShowIterationChange(enabled: boolean): void {
    this.preferences.setShowIteration(enabled);
  }

  onLeftHandedChange(enabled: boolean): void {
    this.preferences.setLeftHanded(enabled);
  }

  transportBeside(item: StepsItem, state: PlaybackState): boolean {
    return (
      this.hasVideo(item) &&
      this.preferences.showVideo &&
      state.isTimedStep &&
      !this.isGap(state) &&
      !this.instructionCard(state) &&
      !this.stillOverlay(state)
    );
  }

  toggleMute(): void {
    this.setMuted(!this.playback.snapshot.userMuted);
  }

  toggleSettingsPanel(): void {
    void this.stepsListDrawer()?.close();
    void this.settingsDrawer()?.toggle();
  }

  onSettingsOpenedChange(open: boolean): void {
    this.settingsOpen = open;
  }

  toggleStepsListPanel(): void {
    void this.settingsDrawer()?.close();
    void this.stepsListDrawer()?.toggle();
  }

  onStepsListOpenedChange(open: boolean): void {
    this.stepsListOpen = open;
  }

  closeStepsListPanel(): void {
    this.stepsListOpen = false;
    void this.stepsListDrawer()?.close();
  }

  start(): void {
    this.closeStepsListPanel();
    const item = this.playback.snapshot.stepsItem;
    if (item) {
      this.analytics.trackOnce(
        `started:${item.id}`,
        AnalyticsEvent.GoduStarted,
        this.goduProps(item),
      );
      this.playHistory.record(item, 'started');
    }
    void this.wakeLock.request();
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
        activityIndex > current
          ? AnalyticsEvent.NextStepClicked
          : AnalyticsEvent.PreviousStepClicked;
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

  goToListedStep(activityIndex: number): void {
    this.selectActivityStep(activityIndex);
    this.closeStepsListPanel();
  }

  togglePause(state: PlaybackState): void {
    if (state.phase === 'playing' || state.phase === 'gap') {
      void this.playback.pause();
    } else if (state.phase === 'paused') {
      void this.wakeLock.request();
      void this.playback.resume();
    }
  }

  isGap(state: PlaybackState): boolean {
    return state.phase === 'gap' || (state.phase === 'paused' && state.gapActive);
  }

  iterationCaption(state: PlaybackState): string | null {
    return formatIterationCaption(
      state.iteration,
      state.iterationCount,
      this.preferences.showIteration,
    );
  }

  canWrapNext(state: PlaybackState): boolean {
    return hasMoreIterations(state.iteration, state.iterationCount);
  }

  canWrapPrevious(state: PlaybackState): boolean {
    return hasPreviousIteration(state.iteration, state.iterationCount);
  }

  isFinalStep(state: PlaybackState): boolean {
    return isOnFinalStep(state);
  }

  showEnd(state: PlaybackState): boolean {
    if (state.phase === 'idle' || state.phase === 'ready' || state.phase === 'completed') {
      return false;
    }
    return isOnFinalStep(state);
  }

  next(): void {
    void this.playback.next();
  }

  previous(): void {
    void this.playback.previous();
  }

  endSession(): void {
    void this.playback.complete();
  }

  onHoldAdvance(state: PlaybackState): void {
    if (this.isFinalStep(state)) {
      this.endSession();
      return;
    }
    this.next();
  }

  replay(): void {
    this.lastPlayingStep = null;
    this.lastCompletedStep = null;
    void this.playback.restart();
  }

  replayClip(): void {
    const item = this.playback.snapshot.stepsItem;
    const stepNumber = this.playback.snapshot.stepNumber;
    if (item && stepNumber != null) {
      this.analytics.track(AnalyticsEvent.StepRepeated, {
        ...this.goduProps(item),
        stepNumber,
      });
    }
    void this.playback.replayCurrentClip();
  }

  formatRemaining(seconds: number | null): string {
    return formatCountdown(seconds);
  }

  stepDurationLabel(step: StepDefinition): string {
    return formatCompactDuration(step.durationSeconds);
  }

  timerProgress(state: PlaybackState): number {
    return countdownProgress(state.remainingSeconds, state.selectedStep?.durationSeconds);
  }

  timerRingOffset(state: PlaybackState): number {
    return this.timerProgress(state);
  }

  gapCountdown(seconds: number | null): string {
    const remaining = seconds ?? 0;
    const count = formatCountdown(remaining);
    if (countdownUsesMinutes(remaining)) {
      return count;
    }
    return remaining === 1 ? `${count} second` : `${count} seconds`;
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
    this.syncTimingBeepsToPlayback();
  }

  private syncVoiceCuesToPlayback(): void {
    this.playback.setVoiceCuesEnabled(
      this.userSettings.voiceCues && !this.playback.snapshot.userMuted,
    );
  }

  private syncTimingBeepsToPlayback(): void {
    const item = this.playback.snapshot.stepsItem;
    this.playback.setTimingBeepSeconds(
      resolveTimingBeepSeconds({
        goduSeconds: item?.timingBeepSeconds,
        userEnabled: this.preferences.timingBeeps && !this.playback.snapshot.userMuted,
        userSeconds: this.preferences.timingBeepSeconds,
      }),
    );
  }

  closeSettingsPanel(): void {
    this.settingsOpen = false;
    void this.settingsDrawer()?.close();
  }

  private resolveItem(params: ParamMap): Observable<StepsItem> {
    const id = params.get('id');
    if (id) {
      return this.demoSteps.getById(id).pipe(
        catchError(() =>
          this.myStepsApi.getAsStepsItem(id).pipe(
            catchError(() => {
              throw new Error('This Godu was not found.');
            }),
          ),
        ),
      ).pipe(switchMap((item) => this.applySettings(item)));
    }

    const username = params.get('username');
    const slug = params.get('slug');
    const provider = this.route.snapshot.data['provider'] as string | undefined;
    if (username && slug && provider) {
      return this.publicStepsApi.getAsStepsItem(provider, username, slug).pipe(
        catchError(() => {
          throw new Error('This public Godu was not found.');
        }),
      ).pipe(switchMap((item) => this.applySettings(item)));
    }

    return throwError(() => new Error('This Godu was not found.'));
  }

  private applySettings(item: StepsItem): Observable<StepsItem> {
    return this.userSettings.hydrate().pipe(
      take(1),
      switchMap(() => this.savedGodus.item$(item.id)),
      takeUntil(this.destroy$),
      take(1),
      tap((saved) => {
        const recommendation = item.recommendedPlaybackSettings ?? {};
        const override = saved?.userSettings ?? {};
        this.preferences.setClipAudio(override.clipAudio ?? recommendation.clipAudio ?? true);
        this.preferences.setVoiceCues(override.voiceCues ?? recommendation.voiceCues ?? this.preferences.voiceCues);
        this.preferences.setTimingBeeps(override.timingBeeps ?? recommendation.timingBeeps ?? true);
        this.preferences.setTimingBeepSeconds(
          override.timingBeepSeconds ?? recommendation.timingBeepSeconds ?? this.preferences.timingBeepSeconds,
        );
      }),
      map(() => item),
    );
  }

  private saveCurrentGoduSettings(): void {
    const item = this.playback.snapshot.stepsItem;
    if (!item) {
      return;
    }
    this.savedGodus.item$(item.id).pipe(take(1)).subscribe((saved) => {
      if (saved) {
        this.savedGodus.updateSettings(item.id, {
          clipAudio: this.preferences.clipAudio,
          voiceCues: this.preferences.voiceCues,
          timingBeeps: this.preferences.timingBeeps,
          timingBeepSeconds: this.preferences.timingBeepSeconds,
        }).subscribe();
      }
    });
  }

  private resolveRelated(item: StepsItem): Observable<StepsItem[]> {
    const provider = item.video.provider;
    const username = item.video.creatorUsername;
    const slug = item.slug;
    const isPublic =
      item.visibility === StepsVisibility.Public || !!this.route.snapshot.paramMap.get('slug');

    if (isPublic && provider && username && slug) {
      return this.publicStepsApi
        .getRelatedAsStepsItems(provider, username, slug)
        .pipe(catchError(() => of([])));
    }

    return this.demoSteps.getRelatedByCreator(item);
  }

  backLink(): string {
    return viewerBackPathFromUrl(this.router.url, (id) => this.demoSteps.isDemo(id));
  }

  goBack(): void {
    void this.router.navigateByUrl(this.backLink());
  }

  async share(item: StepsItem): Promise<void> {
    const method = await this.shareGodu.share(item);
    if (method !== 'copy-link') {
      return;
    }
    this.shareCopied = true;
    if (this.shareCopiedTimer) {
      clearTimeout(this.shareCopiedTimer);
    }
    this.shareCopiedTimer = setTimeout(() => {
      this.shareCopied = false;
    }, 2000);
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

    this.analytics.trackOnce(`completed:${item.id}`, AnalyticsEvent.GoduCompleted, {
      ...this.goduProps(item),
      stepCount: totalSteps,
      elapsedSeconds: this.playback.snapshot.elapsedSeconds ?? undefined,
    });
    this.playHistory.record(item, 'completed', {
      stepCount: totalSteps,
      iterationCount: resolvedRepeatCount(item),
      elapsedSeconds: hasTimedActivity(item.steps)
        ? this.playback.snapshot.elapsedSeconds
        : undefined,
    });
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
    if (snap.phase === 'completed' || snap.phase === 'idle') {
      return;
    }

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
