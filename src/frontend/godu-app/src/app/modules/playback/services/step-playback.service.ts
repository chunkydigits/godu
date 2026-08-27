import { Injectable, NgZone, OnDestroy, Optional } from '@angular/core';
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
import {
  activityCount,
  activityDisplayTitle,
  activityIndexAtOrAfter,
  activityIndexToEntryIndex,
  activityMediaSeconds,
  activityNumberAt,
  activityUsesClip,
  firstActivityIndex,
  hasMoreIterations,
  isCardEntry,
  lastActivityIndex,
  previousActivityIndex,
  resolveStartGapSeconds,
  resolveStartGapMessage,
  resolvedRepeatCount,
  shouldLoopVideo,
} from '../models/step-entry';
import { usesVideoContent } from '../models/video-reference.model';
import { StepTransition, resolveStepTransition, resolveWrapTransition } from '../models/step-transition';
import { isContinuousSoundtrackEnabled } from '../models/continuous-soundtrack.feature';
import { ControllableVideoPlayer } from '../models/video-player.interface';
import { PlaybackVoiceCues } from './playback-voice-cues';

export type PlaybackPhase = 'idle' | 'ready' | 'playing' | 'paused' | 'gap' | 'completed';

export interface PlaybackState {
  stepsItem: StepsItem | null;
  selectedStep: StepDefinition | null;
  /** Index into `stepsItem.steps`, which may also contain gap entries. */
  selectedIndex: number;
  /** 1-based position of the selected step among activity steps, ignoring gaps. */
  stepNumber: number | null;
  /** Number of activity steps, ignoring gaps. */
  stepCount: number;
  phase: PlaybackPhase;
  remainingSeconds: number | null;
  isTimedStep: boolean;
  userMuted: boolean;
  voiceCuesEnabled: boolean;
  continuousSoundtrackActive: boolean;
  /** True while a between-step gap is running or paused mid-gap. */
  gapActive: boolean;
  /** True when the running gap is the demo before the first timer. */
  startGapActive: boolean;
  /** Copy to show during the running gap, from the gap entry or the item default. */
  gapMessage: string | null;
  /** Untimed play-once: clip finished, step copy is held over the video. */
  clipHoldActive: boolean;
  /** Session-only: loop every step clip, including untimed play-once steps. */
  loopAll: boolean;
  /**
   * Session override for clip looping. `true` loops every clip, `false` plays
   * once, `null` follows each step's loopVideo (and loopAll).
   */
  loopOverride: boolean | null;
  /** 1-based pass through the Godu when repeatCount is set. */
  iteration: number;
  /** Total passes. 1 means a single run. */
  iterationCount: number;
  /** Wall-clock seconds from Start to completion. Null until the session ends. */
  elapsedSeconds: number | null;
}

const initialState: PlaybackState = {
  stepsItem: null,
  selectedStep: null,
  selectedIndex: -1,
  stepNumber: null,
  stepCount: 0,
  phase: 'idle',
  remainingSeconds: null,
  isTimedStep: false,
  userMuted: false,
  voiceCuesEnabled: false,
  continuousSoundtrackActive: false,
  gapActive: false,
  startGapActive: false,
  gapMessage: null,
  clipHoldActive: false,
  loopAll: false,
  loopOverride: null,
  iteration: 1,
  iterationCount: 1,
  elapsedSeconds: null,
};

/**
 * Backup poll if a TikTok `onCurrentTime` message is dropped. Clip ends use
 * `>= endSeconds`, so any later report stops the clip — this only covers a
 * missed event, not an exact timestamp.
 */
const MEDIA_POLL_MS = 500;
/**
 * How long a step timer waits for the embed to confirm playback. Long enough to
 * cover a cold start so the timer and video run together, but capped so a
 * provider that never reports still leaves the routine usable.
 */
const PLAYBACK_STARTED_TIMEOUT_MS = 3000;

@Injectable()
export class StepPlaybackService implements OnDestroy {
  private player: ControllableVideoPlayer | null = null;
  private soundtrackPlayer: ControllableVideoPlayer | null = null;
  private readonly stateSubject = new BehaviorSubject<PlaybackState>(initialState);
  private timerSub: Subscription | null = null;
  private mediaPollSub: Subscription | null = null;
  private visualTimeSub: Subscription | null = null;
  private soundtrackTimeSub: Subscription | null = null;
  private loopArmed = false;
  private visualSuspended = false;
  private sessionGeneration = 0;
  private lastLoopSeekAt = 0;
  private loopSeekPending = false;
  private timerKind: 'activity' | 'gap' = 'activity';
  private gapMediaStarted = false;
  private gapTotalSeconds = 0;
  private sessionStartedAt: number | null = null;
  private completing = false;
  private readonly voiceCues = new PlaybackVoiceCues();

  constructor(@Optional() private readonly ngZone?: NgZone) {}

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
    this.visualTimeSub = player.timeUpdates.subscribe((update) => {
      this.runInApp(() => this.onVisualTime(update.currentTime));
    });
    this.applyAudioRouting();
  }

  async attachSoundtrackPlayer(player: ControllableVideoPlayer): Promise<void> {
    await this.detachSoundtrackPlayer();
    this.soundtrackPlayer = player;
    await player.initialise();
    this.soundtrackTimeSub = player.timeUpdates.subscribe((update) => {
      this.runInApp(() => this.onSoundtrackTime(update.currentTime, update.duration));
    });
    this.applyAudioRouting();
  }

  async load(stepsItem: StepsItem): Promise<void> {
    this.bumpSession();
    this.stopTimer();
    this.setLoopArmed(false);
    this.gapMediaStarted = false;
    this.gapTotalSeconds = 0;
    this.sessionStartedAt = null;
    this.completing = false;
    this.voiceCues.cancel();
    const sameItem = this.snapshot.stepsItem?.id === stepsItem.id;
    const loopOverride = sameItem ? this.snapshot.loopOverride : null;
    const loopAll = loopOverride === true;
    const iterationCount = resolvedRepeatCount(stepsItem);
    this.patch({
      stepsItem,
      selectedStep: null,
      selectedIndex: -1,
      phase: 'idle',
      remainingSeconds: null,
      isTimedStep: false,
      continuousSoundtrackActive: false,
      gapActive: false,
      startGapActive: false,
      gapMessage: null,
      clipHoldActive: false,
      loopAll,
      loopOverride,
      iteration: 1,
      iterationCount,
      elapsedSeconds: null,
    });

    const first = firstActivityIndex(stepsItem.steps);
    if (first != null) {
      await this.selectStep(first, { activate: false });
    }
  }

  setUserMuted(muted: boolean): void {
    this.patch({ userMuted: muted });
    this.applyAudioRouting();
  }

  setLoopAll(enabled: boolean): void {
    this.setLoopOverride(enabled ? true : null);
  }

  /** `true` loops every clip, `false` plays once, `null` follows each step. */
  setLoopOverride(override: boolean | null): void {
    this.patch({
      loopOverride: override,
      loopAll: override === true,
    });
  }

  /** Replay the current step clip from the start (play-once hold, or mid-step). */
  async replayCurrentClip(): Promise<void> {
    const { stepsItem, selectedIndex, selectedStep, phase } = this.snapshot;
    if (!stepsItem || !selectedStep || selectedIndex < 0) {
      return;
    }
    if (phase === 'idle' || phase === 'ready' || phase === 'completed' || phase === 'gap') {
      return;
    }

    this.voiceCues.unlockFromUserGesture();
    await this.selectStep(selectedIndex, { skipVoiceAnnounce: true });
  }

  setVoiceCuesEnabled(enabled: boolean): void {
    this.voiceCues.enabled = enabled;
    this.patch({ voiceCuesEnabled: enabled });
    if (!enabled) {
      this.voiceCues.cancel();
    }
    this.applyAudioRouting();
  }

  unlockVoiceCuesFromUserGesture(): void {
    this.voiceCues.unlockFromUserGesture();
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
    this.sessionStartedAt = Date.now();

    const index =
      selectedIndex >= 0 ? selectedIndex : (firstActivityIndex(stepsItem.steps) ?? -1);
    const step = stepsItem.steps[index];
    if (!step) {
      return;
    }

    const timed = step.durationSeconds != null && step.durationSeconds > 0;
    const useSoundtrack = isContinuousSoundtrackEnabled(stepsItem) && timed;
    const introSeconds = resolveStartGapSeconds(stepsItem);
    const useClip = this.stepUsesClip(step);

    if (introSeconds > 0) {
      if (!this.visualSuspended && useClip) {
        this.soundtrackPlayer?.pause();
        this.player?.kickstartFromUserGesture(activityMediaSeconds(step), {
          muted: this.clipAudioMuted(),
        });
      }

      await this.beginGap(
        {
          nextIndex: index,
          gapSeconds: introSeconds,
          gapMessage: resolveStartGapMessage(stepsItem),
        },
        {
          startMediaImmediately: true,
          mediaAlreadyKickstarted: !this.visualSuspended,
          isStartGap: true,
        },
      );
      return;
    }

    // Synchronous kickstarts — preserve user activation
    if (!this.visualSuspended && useClip) {
      if (useSoundtrack) {
        this.soundtrackPlayer?.kickstartFromUserGesture(0, {
          muted: this.clipAudioMuted(),
        });
        this.player?.kickstartFromUserGesture(activityMediaSeconds(step), { muted: true });
      } else {
        this.soundtrackPlayer?.pause();
        this.player?.kickstartFromUserGesture(activityMediaSeconds(step), {
          muted: this.clipAudioMuted(),
        });
      }
    }

    // Speak in this tap so iOS unlocks TTS for later auto-advanced steps.
    this.voiceCues.announceActivityStart(activityDisplayTitle(step), step.durationSeconds, null);

    await this.selectStep(index, {
      activate: true,
      mediaAlreadyKickstarted: true,
      skipVoiceAnnounce: true,
    });
  }

  /** Selects by position among activity steps, as listed in the step navigator. */
  async selectActivityStep(activityIndex: number): Promise<void> {
    const steps = this.snapshot.stepsItem?.steps ?? [];
    const index = activityIndexToEntryIndex(steps, activityIndex);
    if (index == null) {
      return;
    }
    this.voiceCues.unlockFromUserGesture();
    await this.selectStep(index);
  }

  async selectStep(
    index: number,
    options: {
      activate?: boolean;
      mediaAlreadyKickstarted?: boolean;
      fromGapSeconds?: number | null;
      skipVoiceAnnounce?: boolean;
    } = {},
  ): Promise<void> {
    const { stepsItem, phase } = this.snapshot;
    if (!stepsItem || index < 0 || index >= stepsItem.steps.length) {
      return;
    }

    // Gaps are not selectable destinations; land on the step they precede.
    const target = activityIndexAtOrAfter(stepsItem.steps, index);
    if (target == null) {
      return;
    }
    index = target;

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
        startGapActive: false,
        gapMessage: null,
        clipHoldActive: false,
      });

      if (this.player && this.stepUsesClip(step)) {
        await this.player.pause();
        await this.player.seek(activityMediaSeconds(step));
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
      startGapActive: false,
      gapMessage: null,
      clipHoldActive: false,
    });

    const useClip = this.stepUsesClip(step);
    const stillCard = isCardEntry(step) && useClip;

    if (!options.mediaAlreadyKickstarted) {
      if (continuousSoundtrackActive && useClip) {
        if (this.soundtrackPlayer) {
          await this.soundtrackPlayer.play();
        }
        if (this.player) {
          await this.player.seek(activityMediaSeconds(step));
          await this.player.play();
        }
      } else {
        if (this.soundtrackPlayer) {
          await this.soundtrackPlayer.pause();
        }
        if (this.player && useClip) {
          await this.player.seek(activityMediaSeconds(step));
          if (stillCard) {
            await this.player.pause();
          } else {
            await this.player.play();
          }
        } else {
          await this.player?.pause();
        }
      }
    } else if (stillCard && this.player) {
      await this.player.pause();
    }

    this.applyAudioRouting();

    if (isTimed) {
      const started =
        useClip && !stillCard
          ? await this.waitUntilPlaybackStarted(generation)
          : generation === this.sessionGeneration && this.snapshot.phase === 'playing';
      if (!started) {
        return;
      }
      this.setLoopArmed(useClip && !stillCard);
      this.startTimer(step.durationSeconds!, 'activity');
      if (!options.skipVoiceAnnounce) {
        this.voiceCues.announceActivityStart(
          activityDisplayTitle(step),
          step.durationSeconds,
          options.fromGapSeconds ?? null,
        );
      }
      return;
    }

    this.setLoopArmed(useClip);
    if (!options.skipVoiceAnnounce) {
      this.voiceCues.announceActivityStart(
        activityDisplayTitle(step),
        step.durationSeconds,
        options.fromGapSeconds ?? null,
      );
    }
  }

  private async advanceTo(transition: StepTransition, phase: PlaybackPhase): Promise<void> {
    if (transition.nextIndex == null) {
      return;
    }
    if (transition.gapSeconds > 0 && (phase === 'playing' || phase === 'paused')) {
      await this.beginGap(transition);
      return;
    }
    await this.selectStep(transition.nextIndex);
  }

  async next(): Promise<void> {
    const { stepsItem, selectedIndex, phase, gapActive } = this.snapshot;
    if (!stepsItem || this.completing) {
      return;
    }

    this.voiceCues.unlockFromUserGesture();

    if (phase === 'gap' || gapActive) {
      await this.finishGap();
      return;
    }

    const transition = resolveStepTransition(stepsItem, selectedIndex);
    if (transition.nextIndex == null) {
      if (hasMoreIterations(this.snapshot.iteration, this.snapshot.iterationCount)) {
        const wrap = resolveWrapTransition(stepsItem);
        if (wrap.nextIndex != null) {
          this.patch({ iteration: this.snapshot.iteration + 1 });
          await this.advanceTo(wrap, phase);
          return;
        }
      }
      if (phase === 'ready') {
        return;
      }
      await this.complete();
      return;
    }

    await this.advanceTo(transition, phase);
  }

  async previous(): Promise<void> {
    const { stepsItem, selectedIndex, iteration } = this.snapshot;
    const previous = previousActivityIndex(stepsItem?.steps ?? [], selectedIndex);
    if (previous != null) {
      this.voiceCues.unlockFromUserGesture();
      await this.selectStep(previous);
      return;
    }
    if (iteration > 1) {
      const last = lastActivityIndex(stepsItem?.steps ?? []);
      if (last != null) {
        this.voiceCues.unlockFromUserGesture();
        this.patch({ iteration: iteration - 1 });
        await this.selectStep(last);
      }
    }
  }

  async pause(): Promise<void> {
    if (
      this.completing ||
      (this.snapshot.phase !== 'playing' && this.snapshot.phase !== 'gap')
    ) {
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

    this.voiceCues.unlockFromUserGesture();

    const { selectedStep, remainingSeconds, isTimedStep, stepsItem, gapActive, clipHoldActive } =
      this.snapshot;
    if (!selectedStep || !stepsItem) {
      return;
    }

    if (clipHoldActive) {
      this.patch({ phase: 'playing' });
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
    if (this.completing || this.snapshot.phase === 'completed') {
      return;
    }

    this.completing = true;
    const elapsedSeconds =
      this.sessionStartedAt == null
        ? null
        : Math.max(0, Math.round((Date.now() - this.sessionStartedAt) / 1000));
    this.sessionStartedAt = null;
    this.bumpSession();
    const generation = this.sessionGeneration;
    this.stopTimer();
    this.setLoopArmed(false);
    this.voiceCues.cancel();
    this.gapMediaStarted = false;
    this.gapTotalSeconds = 0;
    try {
      await this.player?.pause();
      await this.soundtrackPlayer?.pause();
    } catch {
      // Session is already finishing; a provider pause failure must not reopen it.
    }

    await this.voiceCues.announceSessionEnd();
    if (generation !== this.sessionGeneration) {
      this.completing = false;
      return;
    }

    this.patch({
      phase: 'completed',
      remainingSeconds: 0,
      continuousSoundtrackActive: false,
      gapActive: false,
      startGapActive: false,
      gapMessage: null,
      clipHoldActive: false,
      elapsedSeconds,
    });
    this.completing = false;
  }

  async destroy(): Promise<void> {
    this.bumpSession();
    this.stopTimer();
    this.setLoopArmed(false);
    this.completing = false;
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

    if (phase === 'playing' && this.stepUsesClip(selectedStep)) {
      this.setLoopArmed(true);
      this.player.kickstartFromUserGesture(activityMediaSeconds(selectedStep), {
        muted: continuousSoundtrackActive ? true : this.clipAudioMuted(),
      });
      this.applyAudioRouting();
      return;
    }

    if (phase === 'gap') {
      if (!this.stepUsesClip(selectedStep)) {
        this.applyAudioRouting();
        return;
      }
      if (this.gapMediaStarted) {
        void this.resumeGapMedia();
      } else if (this.shouldPrerollGapMedia(this.snapshot.remainingSeconds)) {
        void this.startGapMedia();
      } else {
        void this.player.seek(activityMediaSeconds(selectedStep));
        void this.player.pause();
      }
      this.applyAudioRouting();
      return;
    }

    if ((phase === 'ready' || phase === 'paused') && this.stepUsesClip(selectedStep)) {
      void this.player.seek(activityMediaSeconds(selectedStep));
      void this.player.pause();
      this.applyAudioRouting();
    }
  }

  /** @deprecated Prefer suspendVisualKeepSession — keeps the player instance. */
  async detachVisualKeepSession(): Promise<void> {
    await this.suspendVisualKeepSession();
    await this.detachVisualPlayer();
  }

  private async beginGap(
    transition: StepTransition,
    options: {
      startMediaImmediately?: boolean;
      mediaAlreadyKickstarted?: boolean;
      isStartGap?: boolean;
    } = {},
  ): Promise<void> {
    const { stepsItem } = this.snapshot;
    const nextIndex = transition.nextIndex;
    const nextStep = nextIndex == null ? undefined : stepsItem?.steps[nextIndex];
    const gapSeconds = transition.gapSeconds;
    if (!stepsItem || nextIndex == null || !nextStep || gapSeconds <= 0) {
      if (nextIndex != null) {
        await this.selectStep(nextIndex);
      }
      return;
    }

    this.bumpSession();
    this.stopTimer();
    this.setLoopArmed(false);
    this.gapMediaStarted = false;
    this.gapTotalSeconds = gapSeconds;

    if (!options.mediaAlreadyKickstarted && this.player && this.stepUsesClip(nextStep)) {
      await this.player.seek(activityMediaSeconds(nextStep));
      if (!options.startMediaImmediately && gapSeconds > gapPrerollImmediateMaxSeconds()) {
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
      startGapActive: !!options.isStartGap,
      gapMessage: transition.gapMessage,
      clipHoldActive: false,
    });

    if (options.mediaAlreadyKickstarted) {
      this.gapMediaStarted = true;
      this.setLoopArmed(true);
      this.applyAudioRouting();
    } else if (
      options.startMediaImmediately ||
      gapSeconds <= gapPrerollImmediateMaxSeconds()
    ) {
      await this.startGapMedia();
    }

    this.voiceCues.announceGapStart(activityDisplayTitle(nextStep), nextStep.durationSeconds);
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
    if (!step || !this.stepUsesClip(step)) {
      this.gapMediaStarted = true;
      return;
    }

    this.gapMediaStarted = true;
    if (this.soundtrackPlayer) {
      await this.soundtrackPlayer.pause();
    }
    if (!this.player) {
      return;
    }

    await this.player.seek(activityMediaSeconds(step));
    if (isCardEntry(step)) {
      await this.player.pause();
    } else {
      await this.player.play();
    }
    this.applyAudioRouting();
    this.setLoopArmed(!isCardEntry(step));
  }

  private async resumeGapMedia(): Promise<void> {
    if (this.visualSuspended || !this.player) {
      return;
    }
    await this.player.play();
    this.setLoopArmed(true);
  }

  private async detachVisualPlayer(): Promise<void> {
    this.visualTimeSub?.unsubscribe();
    this.visualTimeSub = null;
    if (this.player) {
      await this.player.destroy();
      this.player = null;
    }
  }

  private async detachSoundtrackPlayer(): Promise<void> {
    this.soundtrackTimeSub?.unsubscribe();
    this.soundtrackTimeSub = null;
    if (this.soundtrackPlayer) {
      await this.soundtrackPlayer.destroy();
      this.soundtrackPlayer = null;
    }
  }

  private runInApp(work: () => void): void {
    if (this.ngZone) {
      this.ngZone.run(work);
      return;
    }
    work();
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
    if (isCardEntry(selectedStep)) {
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
      if (!shouldLoopVideo(selectedStep, this.snapshot.loopAll, this.snapshot.loopOverride)) {
        const timed = selectedStep.durationSeconds != null && selectedStep.durationSeconds > 0;
        if (timed) {
          void this.player.pause();
          return;
        }
        void this.enterClipHold();
        return;
      }
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

      // The first play can be dropped if the embed was not listening yet.
      if (generation === this.sessionGeneration && this.snapshot.phase === 'playing') {
        await this.player?.play();
      }
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

  private async enterClipHold(): Promise<void> {
    this.setLoopArmed(false);
    if (this.player) {
      await this.player.pause();
    }
    if (this.soundtrackPlayer) {
      await this.soundtrackPlayer.pause();
    }
    this.patch({ clipHoldActive: true, remainingSeconds: null });
  }

  private async onGapElapsed(): Promise<void> {
    await this.finishGap();
  }

  private async onTimerElapsed(): Promise<void> {
    const { selectedStep, stepsItem } = this.snapshot;
    if (!selectedStep || !stepsItem) {
      return;
    }

    if (selectedStep.autoAdvance || this.shouldWrapAfterLastStep()) {
      // next() wraps into the next iteration, or completes on the final pass.
      await this.next();
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

  private shouldWrapAfterLastStep(): boolean {
    const { stepsItem, selectedIndex, iteration, iterationCount } = this.snapshot;
    if (!stepsItem || !hasMoreIterations(iteration, iterationCount)) {
      return false;
    }
    return lastActivityIndex(stepsItem.steps) === selectedIndex;
  }

  private stepUsesClip(step: StepDefinition | null | undefined): boolean {
    const item = this.snapshot.stepsItem;
    if (!item || !step) {
      return false;
    }
    return activityUsesClip(step, usesVideoContent(item));
  }

  private bumpSession(): void {
    this.sessionGeneration += 1;
  }

  private patch(partial: Partial<PlaybackState>): void {
    const next = { ...this.stateSubject.value, ...partial };
    const steps = next.stepsItem?.steps ?? [];
    this.stateSubject.next({
      ...next,
      stepCount: activityCount(steps),
      stepNumber: activityNumberAt(steps, next.selectedIndex),
    });
  }
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
