import { Injectable, OnDestroy } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subscription,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  take,
  tap,
  timer,
} from 'rxjs';
import { environment } from '../../../../environments/environment';
import { StepDefinition } from '../models/step-definition.model';
import { StepsItem } from '../models/steps-item.model';
import { isContinuousSoundtrackEnabled } from '../models/continuous-soundtrack.feature';
import { ControllableVideoPlayer } from '../models/video-player.interface';
import { PlaybackVoiceCues } from './playback-voice-cues';

export type PlaybackPhase = 'idle' | 'ready' | 'playing' | 'paused' | 'gap' | 'completed';

export interface PlaybackState {
  stepsItem: StepsItem | null;
  selectedStep: StepDefinition | null;
  selectedIndex: number;
  phase: PlaybackPhase;
  remainingSeconds: number | null;
  isTimedStep: boolean;
  userMuted: boolean;
  voiceCuesEnabled: boolean;
  continuousSoundtrackActive: boolean;
  /** True while a between-step gap is running or paused mid-gap. */
  gapActive: boolean;
}

const initialState: PlaybackState = {
  stepsItem: null,
  selectedStep: null,
  selectedIndex: -1,
  phase: 'idle',
  remainingSeconds: null,
  isTimedStep: false,
  userMuted: false,
  voiceCuesEnabled: false,
  continuousSoundtrackActive: false,
  gapActive: false,
};

const MEDIA_POLL_MS = 500;
const PLAYBACK_STARTED_TIMEOUT_MS = 1000;

@Injectable()
export class StepPlaybackService implements OnDestroy {
  private player: ControllableVideoPlayer | null = null;
  private soundtrackPlayer: ControllableVideoPlayer | null = null;
  private readonly stateSubject = new BehaviorSubject<PlaybackState>(initialState);
  private timerSub: Subscription | null = null;
  private mediaPollSub: Subscription | null = null;
  private loopArmed = false;
  private visualSuspended = false;
  private sessionGeneration = 0;
  private lastLoopSeekAt = 0;
  private loopSeekPending = false;
  private timerKind: 'activity' | 'gap' = 'activity';
  private gapMediaStarted = false;
  private gapTotalSeconds = 0;
  private readonly voiceCues = new PlaybackVoiceCues();

  readonly state$: Observable<PlaybackState> = this.stateSubject.asObservable();

  get snapshot(): PlaybackState {
    return this.stateSubject.value;
  }

  ngOnDestroy(): void {
    void this.destroy();
  }

  async attachPlayer(player: ControllableVideoPlayer): Promise<void> {
    await this.detachVisualPlayer();
    this.player = player;
    await player.initialise();
    this.applyAudioRouting();
  }

  async attachSoundtrackPlayer(player: ControllableVideoPlayer): Promise<void> {
    await this.detachSoundtrackPlayer();
    this.soundtrackPlayer = player;
    await player.initialise();
    this.applyAudioRouting();
  }

  async load(stepsItem: StepsItem): Promise<void> {
    this.bumpSession();
    this.stopTimer();
    this.setLoopArmed(false);
    this.gapMediaStarted = false;
    this.gapTotalSeconds = 0;
    this.voiceCues.cancel();
    this.patch({
      stepsItem,
      selectedStep: null,
      selectedIndex: -1,
      phase: 'idle',
      remainingSeconds: null,
      isTimedStep: false,
      continuousSoundtrackActive: false,
      gapActive: false,
    });

    if (stepsItem.steps.length > 0) {
      await this.selectStep(0, { activate: false });
    }
  }

  setUserMuted(muted: boolean): void {
    this.patch({ userMuted: muted });
    this.applyAudioRouting();
  }

  setVoiceCuesEnabled(enabled: boolean): void {
    this.voiceCues.enabled = enabled;
    this.patch({ voiceCuesEnabled: enabled });
    if (enabled) {
      this.voiceCues.unlockFromUserGesture();
    } else {
      this.voiceCues.cancel();
    }
    this.applyAudioRouting();
  }

  toggleUserMuted(): void {
    this.setUserMuted(!this.snapshot.userMuted);
  }

  /**
   * User gesture: start video playback and activity timer together.
   * Kickstarts must run before any await so the click unlocks embeds.
   */
  async start(): Promise<void> {
    const { stepsItem, selectedIndex, phase } = this.snapshot;
    if (!stepsItem || stepsItem.steps.length === 0) {
      return;
    }
    if (phase !== 'ready' && phase !== 'idle') {
      return;
    }

    this.voiceCues.unlockFromUserGesture();

    const index = selectedIndex >= 0 ? selectedIndex : 0;
    const step = stepsItem.steps[index];
    if (!step) {
      return;
    }

    const timed = step.durationSeconds != null && step.durationSeconds > 0;
    const useSoundtrack = isContinuousSoundtrackEnabled(stepsItem) && timed;

    // Synchronous kickstarts — preserve user activation
    if (!this.visualSuspended) {
      if (useSoundtrack) {
        this.soundtrackPlayer?.kickstartFromUserGesture(0, {
          muted: this.clipAudioMuted(),
        });
        this.player?.kickstartFromUserGesture(step.startSeconds, { muted: true });
      } else {
        this.soundtrackPlayer?.pause();
        this.player?.kickstartFromUserGesture(step.startSeconds, {
          muted: this.clipAudioMuted(),
        });
      }
    }

    await this.selectStep(index, { activate: true, mediaAlreadyKickstarted: true });
  }

  async selectStep(
    index: number,
    options: {
      activate?: boolean;
      mediaAlreadyKickstarted?: boolean;
      fromGapSeconds?: number | null;
    } = {},
  ): Promise<void> {
    const { stepsItem, phase } = this.snapshot;
    if (!stepsItem || index < 0 || index >= stepsItem.steps.length) {
      return;
    }

    const activate =
      options.activate ?? (phase === 'playing' || phase === 'paused' || phase === 'gap');

    this.bumpSession();
    const generation = this.sessionGeneration;
    this.stopTimer();
    this.setLoopArmed(false);

    const step = stepsItem.steps[index];
    const isTimed = step.durationSeconds != null && step.durationSeconds > 0;
    const continuousSoundtrackActive =
      isContinuousSoundtrackEnabled(stepsItem) && isTimed && activate;

    if (!activate) {
      this.patch({
        selectedStep: step,
        selectedIndex: index,
        phase: 'ready',
        isTimedStep: isTimed,
        remainingSeconds: isTimed ? step.durationSeconds! : null,
        continuousSoundtrackActive: false,
        gapActive: false,
      });

      if (this.player) {
        await this.player.pause();
        await this.player.seek(step.startSeconds);
      }
      if (this.soundtrackPlayer) {
        await this.soundtrackPlayer.pause();
      }
      return;
    }

    this.patch({
      selectedStep: step,
      selectedIndex: index,
      phase: 'playing',
      isTimedStep: isTimed,
      remainingSeconds: isTimed ? step.durationSeconds! : null,
      continuousSoundtrackActive,
      gapActive: false,
    });

    if (!options.mediaAlreadyKickstarted) {
      if (continuousSoundtrackActive) {
        if (this.soundtrackPlayer) {
          await this.soundtrackPlayer.play();
        }
        if (this.player) {
          await this.player.seek(step.startSeconds);
          await this.player.play();
        }
      } else {
        if (this.soundtrackPlayer) {
          await this.soundtrackPlayer.pause();
        }
        if (this.player) {
          await this.player.seek(step.startSeconds);
          await this.player.play();
        }
      }
    }

    this.applyAudioRouting();

    if (isTimed) {
      const started = await this.waitUntilPlaybackStarted(generation);
      if (!started) {
        return;
      }
      this.setLoopArmed(true);
      this.startTimer(step.durationSeconds!, 'activity');
      this.voiceCues.announceActivityStart(
        step.title,
        step.durationSeconds,
        options.fromGapSeconds ?? null,
      );
      return;
    }

    this.setLoopArmed(true);
    this.voiceCues.announceActivityStart(
      step.title,
      step.durationSeconds,
      options.fromGapSeconds ?? null,
    );
  }

  async next(): Promise<void> {
    const { stepsItem, selectedIndex, phase, gapActive } = this.snapshot;
    if (!stepsItem) {
      return;
    }

    if (phase === 'gap' || gapActive) {
      await this.finishGap();
      return;
    }

    const nextIndex = selectedIndex + 1;
    if (nextIndex >= stepsItem.steps.length) {
      if (phase === 'ready') {
        return;
      }
      await this.complete();
      return;
    }

    if (this.shouldInsertGap(phase)) {
      await this.beginGap(nextIndex);
      return;
    }

    await this.selectStep(nextIndex);
  }

  async previous(): Promise<void> {
    const { selectedIndex } = this.snapshot;
    if (selectedIndex <= 0) {
      return;
    }
    await this.selectStep(selectedIndex - 1);
  }

  async pause(): Promise<void> {
    if (this.snapshot.phase !== 'playing' && this.snapshot.phase !== 'gap') {
      return;
    }

    this.bumpSession();
    this.stopTimer(false);
    this.setLoopArmed(false);
    this.voiceCues.cancel();
    if (this.player) {
      await this.player.pause();
    }
    if (this.soundtrackPlayer) {
      await this.soundtrackPlayer.pause();
    }
    this.patch({ phase: 'paused' });
  }

  async resume(): Promise<void> {
    if (this.snapshot.phase !== 'paused') {
      return;
    }

    const { selectedStep, remainingSeconds, isTimedStep, stepsItem, gapActive } = this.snapshot;
    if (!selectedStep || !stepsItem) {
      return;
    }

    this.bumpSession();
    const generation = this.sessionGeneration;

    if (gapActive) {
      this.patch({ phase: 'gap' });
      if (remainingSeconds != null && remainingSeconds > 0) {
        this.startTimer(remainingSeconds, 'gap');
        if (this.gapMediaStarted) {
          void this.resumeGapMedia();
        } else if (this.shouldPrerollGapMedia(remainingSeconds)) {
          void this.startGapMedia();
        }
      } else {
        await this.finishGap();
      }
      return;
    }

    const continuousSoundtrackActive =
      isContinuousSoundtrackEnabled(stepsItem) && isTimedStep;

    this.patch({ phase: 'playing', continuousSoundtrackActive });
    this.setLoopArmed(false);

    if (continuousSoundtrackActive) {
      if (this.soundtrackPlayer) {
        await this.soundtrackPlayer.play();
      }
      if (this.player) {
        await this.player.play();
      }
    } else {
      if (this.soundtrackPlayer) {
        await this.soundtrackPlayer.pause();
      }
      if (this.player) {
        await this.player.play();
      }
    }

    this.applyAudioRouting();

    if (isTimedStep && remainingSeconds != null && remainingSeconds > 0) {
      const started = await this.waitUntilPlaybackStarted(generation);
      if (!started) {
        return;
      }
      this.setLoopArmed(true);
      this.startTimer(remainingSeconds, 'activity');
      return;
    }

    this.setLoopArmed(true);
  }

  async restart(): Promise<void> {
    const { stepsItem } = this.snapshot;
    if (!stepsItem) {
      return;
    }
    await this.load(stepsItem);
  }

  async complete(): Promise<void> {
    this.bumpSession();
    this.stopTimer();
    this.setLoopArmed(false);
    this.voiceCues.cancel();
    this.gapMediaStarted = false;
    this.gapTotalSeconds = 0;
    if (this.player) {
      await this.player.pause();
    }
    if (this.soundtrackPlayer) {
      await this.soundtrackPlayer.pause();
    }
    this.patch({
      phase: 'completed',
      remainingSeconds: 0,
      continuousSoundtrackActive: false,
      gapActive: false,
    });
  }

  async destroy(): Promise<void> {
    this.bumpSession();
    this.stopTimer();
    this.setLoopArmed(false);
    this.voiceCues.cancel();
    await this.detachPlayerKeepSession();
    this.stateSubject.next({
      ...initialState,
      userMuted: this.snapshot.userMuted,
      voiceCuesEnabled: this.snapshot.voiceCuesEnabled,
    });
  }

  async detachPlayerKeepSession(): Promise<void> {
    await this.detachVisualPlayer();
    await this.detachSoundtrackPlayer();
  }

  /**
   * Hide video guidance: pause the visual embed but leave timers / step state alone.
   */
  async suspendVisualKeepSession(): Promise<void> {
    this.visualSuspended = true;
    this.setLoopArmed(false);
    if (this.player) {
      await this.player.pause();
    }
  }

  /**
   * Show video guidance again from a user gesture without resetting the activity timer.
   */
  resumeVisualKeepSessionFromUserGesture(): void {
    this.visualSuspended = false;
    const { selectedStep, phase, continuousSoundtrackActive } = this.snapshot;
    if (!selectedStep || !this.player) {
      return;
    }

    if (phase === 'playing') {
      this.setLoopArmed(true);
      this.player.kickstartFromUserGesture(selectedStep.startSeconds, {
        muted: continuousSoundtrackActive ? true : this.clipAudioMuted(),
      });
      this.applyAudioRouting();
      return;
    }

    if (phase === 'gap') {
      if (this.gapMediaStarted) {
        void this.resumeGapMedia();
      } else if (this.shouldPrerollGapMedia(this.snapshot.remainingSeconds)) {
        void this.startGapMedia();
      } else {
        void this.player.seek(selectedStep.startSeconds);
        void this.player.pause();
      }
      this.applyAudioRouting();
      return;
    }

    if (phase === 'ready' || phase === 'paused') {
      void this.player.seek(selectedStep.startSeconds);
      void this.player.pause();
      this.applyAudioRouting();
    }
  }

  /** @deprecated Prefer suspendVisualKeepSession — keeps the player instance. */
  async detachVisualKeepSession(): Promise<void> {
    await this.suspendVisualKeepSession();
    await this.detachVisualPlayer();
  }

  private async beginGap(nextIndex: number): Promise<void> {
    const { stepsItem } = this.snapshot;
    const nextStep = stepsItem?.steps[nextIndex];
    const gapSeconds = resolveGapSeconds(stepsItem);
    if (!stepsItem || !nextStep || gapSeconds <= 0) {
      await this.selectStep(nextIndex);
      return;
    }

    this.bumpSession();
    this.stopTimer();
    this.setLoopArmed(false);
    this.gapMediaStarted = false;
    this.gapTotalSeconds = gapSeconds;

    if (this.player) {
      await this.player.seek(nextStep.startSeconds);
      if (gapSeconds > gapPrerollImmediateMaxSeconds()) {
        await this.player.pause();
      }
    }
    if (this.soundtrackPlayer) {
      await this.soundtrackPlayer.pause();
    }

    this.patch({
      selectedStep: nextStep,
      selectedIndex: nextIndex,
      phase: 'gap',
      isTimedStep: true,
      remainingSeconds: gapSeconds,
      continuousSoundtrackActive: false,
      gapActive: true,
    });

    if (gapSeconds <= gapPrerollImmediateMaxSeconds()) {
      await this.startGapMedia();
    }

    this.voiceCues.announceGapStart(nextStep.title, nextStep.durationSeconds);
    this.startTimer(gapSeconds, 'gap');
  }

  private async finishGap(): Promise<void> {
    const { selectedIndex, stepsItem } = this.snapshot;
    if (!stepsItem || selectedIndex < 0) {
      return;
    }
    const gapSeconds = this.gapTotalSeconds;
    const prerolled = this.gapMediaStarted;
    this.gapMediaStarted = false;
    this.gapTotalSeconds = 0;
    await this.selectStep(selectedIndex, {
      activate: true,
      mediaAlreadyKickstarted: prerolled,
      fromGapSeconds: gapSeconds,
    });
  }

  private shouldInsertGap(phase: PlaybackPhase): boolean {
    if (phase !== 'playing' && phase !== 'paused') {
      return false;
    }
    return resolveGapSeconds(this.snapshot.stepsItem) > 0;
  }

  private shouldPrerollGapMedia(remaining: number | null): boolean {
    if (remaining == null) {
      return false;
    }
    if (this.gapTotalSeconds <= gapPrerollImmediateMaxSeconds()) {
      return true;
    }
    return remaining <= gapPrerollLeadSeconds();
  }

  private async startGapMedia(): Promise<void> {
    if (this.gapMediaStarted || this.visualSuspended) {
      return;
    }
    const step = this.snapshot.selectedStep;
    if (!step) {
      return;
    }

    this.gapMediaStarted = true;
    if (this.soundtrackPlayer) {
      await this.soundtrackPlayer.pause();
    }
    if (!this.player) {
      return;
    }

    await this.player.seek(step.startSeconds);
    await this.player.play();
    this.applyAudioRouting();
    this.setLoopArmed(true);
  }

  private async resumeGapMedia(): Promise<void> {
    if (this.visualSuspended || !this.player) {
      return;
    }
    await this.player.play();
    this.setLoopArmed(true);
  }

  private async detachVisualPlayer(): Promise<void> {
    if (this.player) {
      await this.player.destroy();
      this.player = null;
    }
  }

  private async detachSoundtrackPlayer(): Promise<void> {
    if (this.soundtrackPlayer) {
      await this.soundtrackPlayer.destroy();
      this.soundtrackPlayer = null;
    }
  }

  private clipAudioMuted(): boolean {
    const { userMuted, voiceCuesEnabled } = this.snapshot;
    return userMuted || voiceCuesEnabled;
  }

  private applyAudioRouting(): void {
    const { continuousSoundtrackActive } = this.snapshot;
    const muted = this.clipAudioMuted();

    if (continuousSoundtrackActive) {
      this.player?.setMuted(true);
      this.soundtrackPlayer?.setMuted(muted);
      return;
    }

    this.player?.setMuted(muted);
    this.soundtrackPlayer?.setMuted(true);
  }

  private setLoopArmed(armed: boolean): void {
    this.loopArmed = armed;
    if (!armed) {
      this.loopSeekPending = false;
      this.stopMediaPoll();
      return;
    }
    this.ensureMediaPoll();
  }

  private ensureMediaPoll(): void {
    if (this.mediaPollSub) {
      return;
    }
    this.mediaPollSub = timer(0, MEDIA_POLL_MS).subscribe(() => {
      void this.pollMedia();
    });
  }

  private stopMediaPoll(): void {
    this.mediaPollSub?.unsubscribe();
    this.mediaPollSub = null;
  }

  private async pollMedia(): Promise<void> {
    if (!this.loopArmed || this.snapshot.phase !== 'playing') {
      return;
    }

    if (this.player) {
      const currentTime = await this.player.getCurrentTime();
      this.onVisualTime(currentTime);
    }

    if (this.soundtrackPlayer && this.snapshot.continuousSoundtrackActive) {
      const currentTime = await this.soundtrackPlayer.getCurrentTime();
      this.onSoundtrackTime(currentTime, 0);
    }
  }

  private onVisualTime(currentTime: number): void {
    const { selectedStep, phase } = this.snapshot;
    if (!selectedStep || phase !== 'playing' || !this.loopArmed || !this.player) {
      return;
    }

    if (this.loopSeekPending) {
      if (
        currentTime >= selectedStep.startSeconds - 0.5 &&
        currentTime < selectedStep.endSeconds
      ) {
        this.loopSeekPending = false;
      }
      return;
    }

    if (currentTime >= selectedStep.endSeconds) {
      this.loopSeekPending = true;
      this.lastLoopSeekAt = Date.now();
      void this.player.seek(selectedStep.startSeconds);
    }
  }

  private onSoundtrackTime(currentTime: number, duration: number): void {
    if (!this.snapshot.continuousSoundtrackActive || !this.soundtrackPlayer) {
      return;
    }
    if (this.snapshot.phase !== 'playing') {
      return;
    }
    if (duration > 0 && currentTime >= duration - 0.35) {
      void this.soundtrackPlayer.seek(0);
    }
  }

  private async waitUntilPlaybackStarted(generation: number): Promise<boolean> {
    if (this.visualSuspended || !this.player) {
      return generation === this.sessionGeneration && this.snapshot.phase === 'playing';
    }

    const startedAt = Date.now();
    while (true) {
      if (generation !== this.sessionGeneration || this.snapshot.phase !== 'playing') {
        return false;
      }

      if (await this.readIsPlaying()) {
        return true;
      }

      const remainingMs = PLAYBACK_STARTED_TIMEOUT_MS - (Date.now() - startedAt);
      if (remainingMs <= 0) {
        return generation === this.sessionGeneration && this.snapshot.phase === 'playing';
      }

      await firstValueFrom(timer(Math.min(MEDIA_POLL_MS, remainingMs)));
    }
  }

  private async readIsPlaying(): Promise<boolean> {
    if (!this.player) {
      return false;
    }

    try {
      return await firstValueFrom(this.player.isPlaying.pipe(take(1)));
    } catch {
      return false;
    }
  }

  private startTimer(totalSeconds: number, kind: 'activity' | 'gap'): void {
    this.stopTimer(false);
    this.timerKind = kind;
    const endAt = Date.now() + totalSeconds * 1000;

    this.timerSub = timer(0, 250)
      .pipe(
        map(() => Math.max(0, Math.ceil((endAt - Date.now()) / 1000))),
        distinctUntilChanged(),
        tap((remaining) => {
          this.patch({ remainingSeconds: remaining });
          if (this.timerKind !== 'gap') {
            return;
          }
          if (this.shouldPrerollGapMedia(remaining)) {
            void this.startGapMedia();
          }
          const step = this.snapshot.selectedStep;
          if (step) {
            this.voiceCues.maybeScheduleTimedGo(
              step.title,
              step.durationSeconds,
              remaining,
              this.gapTotalSeconds,
            );
          }
        }),
        filter((remaining) => remaining <= 0),
        take(1),
      )
      .subscribe(() => {
        if (this.timerKind === 'gap') {
          void this.onGapElapsed();
        } else {
          void this.onTimerElapsed();
        }
      });
  }

  private stopTimer(clearRemaining = true): void {
    this.timerSub?.unsubscribe();
    this.timerSub = null;
    if (clearRemaining) {
      // remaining handled by callers when needed
    }
  }

  private async onGapElapsed(): Promise<void> {
    await this.finishGap();
  }

  private async onTimerElapsed(): Promise<void> {
    const { selectedStep, selectedIndex, stepsItem } = this.snapshot;
    if (!selectedStep || !stepsItem) {
      return;
    }

    if (selectedStep.autoAdvance) {
      if (selectedIndex >= stepsItem.steps.length - 1) {
        await this.complete();
      } else {
        await this.next();
      }
      return;
    }

    this.bumpSession();
    this.stopTimer();
    this.setLoopArmed(false);
    if (this.player) {
      await this.player.pause();
    }
    if (this.soundtrackPlayer) {
      await this.soundtrackPlayer.pause();
    }
    this.patch({
      phase: 'paused',
      remainingSeconds: 0,
      continuousSoundtrackActive: false,
    });
  }

  private bumpSession(): void {
    this.sessionGeneration += 1;
  }

  private patch(partial: Partial<PlaybackState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...partial,
    });
  }
}

function resolveGapSeconds(item: StepsItem | null | undefined): number {
  const value = item?.gapSeconds;
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(600, Math.floor(value));
}

function gapPrerollImmediateMaxSeconds(): number {
  const value = environment.playback.gapPrerollImmediateMaxSeconds;
  if (!Number.isFinite(value) || value < 0) {
    return 15;
  }
  return Math.floor(value);
}

function gapPrerollLeadSeconds(): number {
  const value = environment.playback.gapPrerollLeadSeconds;
  if (!Number.isFinite(value) || value < 0) {
    return 10;
  }
  return Math.floor(value);
}
