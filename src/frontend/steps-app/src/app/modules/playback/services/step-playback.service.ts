import { Injectable, OnDestroy } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subscription,
  filter,
  map,
  of,
  switchMap,
  take,
  timer,
} from 'rxjs';
import { StepDefinition } from '../models/step-definition.model';
import { StepsItem } from '../models/steps-item.model';
import { isContinuousSoundtrackEnabled } from '../models/continuous-soundtrack.feature';
import { ControllableVideoPlayer } from '../models/video-player.interface';

export type PlaybackPhase = 'idle' | 'ready' | 'playing' | 'paused' | 'completed';

export interface PlaybackState {
  stepsItem: StepsItem | null;
  selectedStep: StepDefinition | null;
  selectedIndex: number;
  phase: PlaybackPhase;
  remainingSeconds: number | null;
  isTimedStep: boolean;
  userMuted: boolean;
  continuousSoundtrackActive: boolean;
}

const initialState: PlaybackState = {
  stepsItem: null,
  selectedStep: null,
  selectedIndex: -1,
  phase: 'idle',
  remainingSeconds: null,
  isTimedStep: false,
  userMuted: false,
  continuousSoundtrackActive: false,
};

@Injectable()
export class StepPlaybackService implements OnDestroy {
  private player: ControllableVideoPlayer | null = null;
  private soundtrackPlayer: ControllableVideoPlayer | null = null;
  private readonly stateSubject = new BehaviorSubject<PlaybackState>(initialState);
  private playerSub: Subscription | null = null;
  private soundtrackSub: Subscription | null = null;
  private timerSub: Subscription | null = null;
  private loopArmed = false;

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

    this.playerSub = player.ready
      .pipe(
        filter((ready) => ready),
        take(1),
        switchMap(() => player.timeUpdates),
      )
      .subscribe((update) => this.onVisualTime(update.currentTime));

    this.applyAudioRouting();
  }

  async attachSoundtrackPlayer(player: ControllableVideoPlayer): Promise<void> {
    await this.detachSoundtrackPlayer();
    this.soundtrackPlayer = player;
    await player.initialise();

    this.soundtrackSub = player.ready
      .pipe(
        filter((ready) => ready),
        take(1),
        switchMap(() => player.timeUpdates),
      )
      .subscribe((update) => this.onSoundtrackTime(update.currentTime, update.duration));

    this.applyAudioRouting();
  }

  async load(stepsItem: StepsItem): Promise<void> {
    this.stopTimer();
    this.loopArmed = false;
    this.patch({
      stepsItem,
      selectedStep: null,
      selectedIndex: -1,
      phase: 'idle',
      remainingSeconds: null,
      isTimedStep: false,
      continuousSoundtrackActive: false,
    });

    if (stepsItem.steps.length > 0) {
      await this.selectStep(0, { activate: false });
    }
  }

  setUserMuted(muted: boolean): void {
    this.patch({ userMuted: muted });
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

    const index = selectedIndex >= 0 ? selectedIndex : 0;
    const step = stepsItem.steps[index];
    if (!step) {
      return;
    }

    const timed = step.durationSeconds != null && step.durationSeconds > 0;
    const useSoundtrack = isContinuousSoundtrackEnabled(stepsItem) && timed;

    // Synchronous kickstarts — preserve user activation
    if (useSoundtrack) {
      this.soundtrackPlayer?.kickstartFromUserGesture(0, {
        muted: this.snapshot.userMuted,
      });
      this.player?.kickstartFromUserGesture(step.startSeconds, { muted: true });
    } else {
      this.soundtrackPlayer?.pause();
      this.player?.kickstartFromUserGesture(step.startSeconds, {
        muted: this.snapshot.userMuted,
      });
    }

    await this.selectStep(index, { activate: true, mediaAlreadyKickstarted: true });
  }

  async selectStep(
    index: number,
    options: { activate?: boolean; mediaAlreadyKickstarted?: boolean } = {},
  ): Promise<void> {
    const { stepsItem, phase } = this.snapshot;
    if (!stepsItem || index < 0 || index >= stepsItem.steps.length) {
      return;
    }

    const activate =
      options.activate ?? (phase === 'playing' || phase === 'paused');

    this.stopTimer();
    this.loopArmed = false;

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

    this.loopArmed = true;
    this.patch({
      selectedStep: step,
      selectedIndex: index,
      phase: 'playing',
      isTimedStep: isTimed,
      remainingSeconds: isTimed ? step.durationSeconds! : null,
      continuousSoundtrackActive,
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
      this.startTimer(step.durationSeconds!);
    }
  }

  async next(): Promise<void> {
    const { stepsItem, selectedIndex, phase } = this.snapshot;
    if (!stepsItem) {
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
    if (this.snapshot.phase !== 'playing') {
      return;
    }

    this.stopTimer(false);
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

    const { selectedStep, remainingSeconds, isTimedStep, stepsItem } = this.snapshot;
    if (!selectedStep || !stepsItem) {
      return;
    }

    const continuousSoundtrackActive =
      isContinuousSoundtrackEnabled(stepsItem) && isTimedStep;

    this.patch({ phase: 'playing', continuousSoundtrackActive });
    this.loopArmed = true;

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
      this.startTimer(remainingSeconds);
    }
  }

  async restart(): Promise<void> {
    const { stepsItem } = this.snapshot;
    if (!stepsItem) {
      return;
    }
    await this.load(stepsItem);
  }

  async complete(): Promise<void> {
    this.stopTimer();
    this.loopArmed = false;
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
    });
  }

  async destroy(): Promise<void> {
    this.stopTimer();
    await this.detachPlayerKeepSession();
    this.stateSubject.next({ ...initialState, userMuted: this.snapshot.userMuted });
  }

  async detachPlayerKeepSession(): Promise<void> {
    await this.detachVisualPlayer();
    await this.detachSoundtrackPlayer();
  }

  /**
   * Hide video guidance: pause the visual embed but leave timers / step state alone.
   */
  async suspendVisualKeepSession(): Promise<void> {
    this.loopArmed = false;
    if (this.player) {
      await this.player.pause();
    }
  }

  /**
   * Show video guidance again from a user gesture without resetting the activity timer.
   */
  resumeVisualKeepSessionFromUserGesture(): void {
    const { selectedStep, phase, userMuted, continuousSoundtrackActive } = this.snapshot;
    if (!selectedStep || !this.player) {
      return;
    }

    if (phase === 'playing') {
      this.loopArmed = true;
      this.player.kickstartFromUserGesture(selectedStep.startSeconds, {
        muted: continuousSoundtrackActive ? true : userMuted,
      });
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

  private async detachVisualPlayer(): Promise<void> {
    this.playerSub?.unsubscribe();
    this.playerSub = null;
    if (this.player) {
      await this.player.destroy();
      this.player = null;
    }
  }

  private async detachSoundtrackPlayer(): Promise<void> {
    this.soundtrackSub?.unsubscribe();
    this.soundtrackSub = null;
    if (this.soundtrackPlayer) {
      await this.soundtrackPlayer.destroy();
      this.soundtrackPlayer = null;
    }
  }

  private applyAudioRouting(): void {
    const { userMuted, continuousSoundtrackActive } = this.snapshot;

    if (continuousSoundtrackActive) {
      this.player?.setMuted(true);
      this.soundtrackPlayer?.setMuted(userMuted);
      return;
    }

    this.player?.setMuted(userMuted);
    this.soundtrackPlayer?.setMuted(true);
  }

  private onVisualTime(currentTime: number): void {
    const { selectedStep, phase } = this.snapshot;
    if (!selectedStep || phase !== 'playing' || !this.loopArmed || !this.player) {
      return;
    }

    if (currentTime >= selectedStep.endSeconds) {
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

  private startTimer(totalSeconds: number): void {
    this.stopTimer(false);
    const endAt = Date.now() + totalSeconds * 1000;

    this.timerSub = timer(0, 250)
      .pipe(
        map(() => Math.max(0, Math.ceil((endAt - Date.now()) / 1000))),
        switchMap((remaining) => {
          this.patch({ remainingSeconds: remaining });
          if (remaining <= 0) {
            return of('done' as const);
          }
          return of('tick' as const);
        }),
        filter((v) => v === 'done'),
        take(1),
      )
      .subscribe(() => {
        void this.onTimerElapsed();
      });
  }

  private stopTimer(clearRemaining = true): void {
    this.timerSub?.unsubscribe();
    this.timerSub = null;
    if (clearRemaining) {
      // remaining handled by callers when needed
    }
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

    this.stopTimer();
    this.loopArmed = false;
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

  private patch(partial: Partial<PlaybackState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...partial,
    });
  }
}
