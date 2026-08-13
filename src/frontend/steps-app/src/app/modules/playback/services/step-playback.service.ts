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
import { ControllableVideoPlayer } from '../models/video-player.interface';

export type PlaybackPhase = 'idle' | 'ready' | 'playing' | 'paused' | 'completed';

export interface PlaybackState {
  stepsItem: StepsItem | null;
  selectedStep: StepDefinition | null;
  selectedIndex: number;
  phase: PlaybackPhase;
  remainingSeconds: number | null;
  isTimedStep: boolean;
}

const initialState: PlaybackState = {
  stepsItem: null,
  selectedStep: null,
  selectedIndex: -1,
  phase: 'idle',
  remainingSeconds: null,
  isTimedStep: false,
};

@Injectable()
export class StepPlaybackService implements OnDestroy {
  private player: ControllableVideoPlayer | null = null;
  private readonly stateSubject = new BehaviorSubject<PlaybackState>(initialState);
  private playerSub: Subscription | null = null;
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
    await this.detachPlayer();
    this.player = player;
    await player.initialise();

    this.playerSub = player.ready
      .pipe(
        filter((ready) => ready),
        take(1),
        switchMap(() => player.timeUpdates),
      )
      .subscribe((update) => this.onPlayerTime(update.currentTime));
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
    });

    if (stepsItem.steps.length > 0) {
      await this.selectStep(0, { activate: false });
    }
  }

  /**
   * User gesture: start video playback and activity timer together.
   * Video kickstart must run before any await so the click unlocks the embed.
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

    // Synchronous — preserve user activation for TikTok autoplay unlock
    this.player?.kickstartFromUserGesture(step.startSeconds);

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

    if (!activate) {
      this.patch({
        selectedStep: step,
        selectedIndex: index,
        phase: 'ready',
        isTimedStep: isTimed,
        remainingSeconds: isTimed ? step.durationSeconds! : null,
      });

      if (this.player) {
        await this.player.pause();
        await this.player.seek(step.startSeconds);
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
    });

    if (this.player && !options.mediaAlreadyKickstarted) {
      await this.player.seek(step.startSeconds);
      await this.player.play();
    }

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
    this.patch({ phase: 'paused' });
  }

  async resume(): Promise<void> {
    if (this.snapshot.phase !== 'paused') {
      return;
    }

    const { selectedStep, remainingSeconds, isTimedStep } = this.snapshot;
    if (!selectedStep) {
      return;
    }

    if (this.player) {
      await this.player.play();
    }

    this.patch({ phase: 'playing' });
    this.loopArmed = true;

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
    this.patch({
      phase: 'completed',
      remainingSeconds: 0,
    });
  }

  async destroy(): Promise<void> {
    this.stopTimer();
    this.playerSub?.unsubscribe();
    this.playerSub = null;
    if (this.player) {
      await this.player.destroy();
      this.player = null;
    }
    this.stateSubject.next(initialState);
  }

  private async detachPlayer(): Promise<void> {
    this.stopTimer();
    this.playerSub?.unsubscribe();
    this.playerSub = null;
    if (this.player) {
      await this.player.destroy();
      this.player = null;
    }
  }

  private onPlayerTime(currentTime: number): void {
    const { selectedStep, phase } = this.snapshot;
    if (!selectedStep || phase !== 'playing' || !this.loopArmed || !this.player) {
      return;
    }

    if (currentTime >= selectedStep.endSeconds) {
      void this.player.seek(selectedStep.startSeconds);
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
    this.patch({
      phase: 'paused',
      remainingSeconds: 0,
    });
  }

  private patch(partial: Partial<PlaybackState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...partial,
    });
  }
}
