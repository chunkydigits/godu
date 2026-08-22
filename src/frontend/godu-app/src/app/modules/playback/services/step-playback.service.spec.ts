import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { StepsItem } from '../models/steps-item.model';
import { StepsItemStatus } from '../models/steps-item-status.enum';
import { StepsVisibility } from '../models/steps-visibility.enum';
import { VideoProvider } from '../models/video-provider.enum';
import {
  ControllableVideoPlayer,
  VideoPlayerTimeUpdate,
} from '../models/video-player.interface';
import { StepPlaybackService } from './step-playback.service';

function createDemoItem(overrides: Partial<StepsItem> = {}): StepsItem {
  return {
    id: 'steps_test',
    createdByUserId: 'usr_test',
    visibility: StepsVisibility.Private,
    status: StepsItemStatus.Published,
    title: 'Test',
    video: {
      provider: VideoProvider.TikTok,
      externalVideoId: '123',
      sourceUrl: 'https://www.tiktok.com/@x/video/123',
    },
    steps: [
      {
        id: 's1',
        order: 1,
        title: 'One',
        startSeconds: 0,
        endSeconds: 5,
        durationSeconds: 2,
        autoAdvance: true,
      },
      {
        id: 's2',
        order: 2,
        title: 'Two',
        startSeconds: 5,
        endSeconds: 10,
        durationSeconds: null,
        autoAdvance: false,
      },
    ],
    createdUtc: '2026-08-13T08:00:00Z',
    ...overrides,
  };
}

function createMockPlayer(options: { playing?: boolean } = {}) {
  const ready = new BehaviorSubject(true);
  const isPlaying = new BehaviorSubject(options.playing ?? true);
  const timeUpdates = new Subject<VideoPlayerTimeUpdate>();
  const seek = vi.fn().mockResolvedValue(undefined);
  const play = vi.fn().mockResolvedValue(undefined);
  const pause = vi.fn().mockResolvedValue(undefined);
  const kickstartFromUserGesture = vi.fn();
  const setMuted = vi.fn();
  const player: ControllableVideoPlayer = {
    ready: ready.asObservable(),
    isPlaying: isPlaying.asObservable(),
    timeUpdates: timeUpdates.asObservable(),
    initialise: vi.fn().mockResolvedValue(undefined),
    play,
    pause,
    seek,
    getCurrentTime: vi.fn().mockResolvedValue(0),
    destroy: vi.fn().mockResolvedValue(undefined),
    kickstartFromUserGesture,
    setMuted,
  };
  return {
    player,
    timeUpdates,
    isPlaying,
    seek,
    play,
    pause,
    kickstartFromUserGesture,
    setMuted,
  };
}

describe('StepPlaybackService', () => {
  let service: StepPlaybackService;

  beforeEach(() => {
    service = new StepPlaybackService();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await service.destroy();
    vi.useRealTimers();
  });

  it('load prepares the first step without starting playback', async () => {
    const { player } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(createDemoItem());

    expect(service.snapshot.phase).toBe('ready');
    expect(service.snapshot.selectedIndex).toBe(0);
    expect(player.seek).toHaveBeenCalledWith(0);
    expect(player.play).not.toHaveBeenCalled();
    expect(service.snapshot.remainingSeconds).toBe(2);
  });

  it('start begins video and timer together', async () => {
    const { player, kickstartFromUserGesture, play } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(createDemoItem());
    await service.start();

    expect(kickstartFromUserGesture).toHaveBeenCalledWith(0, { muted: false });
    expect(service.snapshot.phase).toBe('playing');
    expect(play).not.toHaveBeenCalled();
    expect(service.snapshot.isTimedStep).toBe(true);
  });

  it('continuousSoundtrack mutes visual and kickstarts soundtrack for timed steps', async () => {
    environment.features.continuousSoundtrack = true;
    try {
      const visual = createMockPlayer();
      const soundtrack = createMockPlayer();
      await service.attachPlayer(visual.player);
      await service.attachSoundtrackPlayer(soundtrack.player);
      await service.load(createDemoItem({ continuousSoundtrack: true }));
      await service.start();

      expect(soundtrack.kickstartFromUserGesture).toHaveBeenCalledWith(0, {
        muted: false,
      });
      expect(visual.kickstartFromUserGesture).toHaveBeenCalledWith(0, {
        muted: true,
      });
      expect(service.snapshot.continuousSoundtrackActive).toBe(true);
      expect(visual.setMuted).toHaveBeenCalledWith(true);
    } finally {
      environment.features.continuousSoundtrack = false;
    }
  });

  it('continuousSoundtrack does not stay active on untimed steps', async () => {
    environment.features.continuousSoundtrack = true;
    try {
      const visual = createMockPlayer();
      const soundtrack = createMockPlayer();
      await service.attachPlayer(visual.player);
      await service.attachSoundtrackPlayer(soundtrack.player);
      await service.load(createDemoItem({ continuousSoundtrack: true }));
      await service.start();
      await service.selectStep(1);

      expect(service.snapshot.continuousSoundtrackActive).toBe(false);
      expect(service.snapshot.isTimedStep).toBe(false);
      expect(soundtrack.pause).toHaveBeenCalled();
    } finally {
      environment.features.continuousSoundtrack = false;
    }
  });

  it('user mute is applied to soundtrack when continuous', async () => {
    environment.features.continuousSoundtrack = true;
    try {
      const visual = createMockPlayer();
      const soundtrack = createMockPlayer();
      await service.attachPlayer(visual.player);
      await service.attachSoundtrackPlayer(soundtrack.player);
      await service.load(createDemoItem({ continuousSoundtrack: true }));
      await service.start();
      soundtrack.setMuted.mockClear();

      service.setUserMuted(true);
      expect(soundtrack.setMuted).toHaveBeenCalledWith(true);
      expect(visual.setMuted).toHaveBeenCalledWith(true);
    } finally {
      environment.features.continuousSoundtrack = false;
    }
  });

  it('ignores item continuousSoundtrack when environment feature is off', async () => {
    environment.features.continuousSoundtrack = false;
    const visual = createMockPlayer();
    const soundtrack = createMockPlayer();
    await service.attachPlayer(visual.player);
    await service.attachSoundtrackPlayer(soundtrack.player);
    await service.load(createDemoItem({ continuousSoundtrack: true }));
    await service.start();

    expect(service.snapshot.continuousSoundtrackActive).toBe(false);
    expect(visual.kickstartFromUserGesture).toHaveBeenCalledWith(0, {
      muted: false,
    });
    expect(soundtrack.kickstartFromUserGesture).not.toHaveBeenCalled();
  });

  it('mutes clip audio when voice cues are enabled', async () => {
    const { player, kickstartFromUserGesture, setMuted } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(createDemoItem());
    service.setVoiceCuesEnabled(true);
    await service.start();

    expect(kickstartFromUserGesture).toHaveBeenCalledWith(0, { muted: true });
    expect(setMuted).toHaveBeenCalledWith(true);
    expect(service.snapshot.voiceCuesEnabled).toBe(true);
  });

  it('selectStep while ready only previews without playing', async () => {
    const { player, play } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(createDemoItem());
    play.mockClear();

    await service.selectStep(1);

    expect(service.snapshot.phase).toBe('ready');
    expect(service.snapshot.selectedIndex).toBe(1);
    expect(player.seek).toHaveBeenCalledWith(5);
    expect(play).not.toHaveBeenCalled();
  });

  it('next after start moves to the following step', async () => {
    const { player } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(createDemoItem());
    await service.start();
    await service.next();

    expect(service.snapshot.selectedIndex).toBe(1);
    expect(player.seek).toHaveBeenCalledWith(5);
    expect(service.snapshot.isTimedStep).toBe(false);
  });

  it('previous does not go below zero', async () => {
    const { player } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(createDemoItem());
    await service.previous();
    expect(service.snapshot.selectedIndex).toBe(0);
  });

  it('loops when currentTime reaches endSeconds only while playing', async () => {
    const { player, seek } = createMockPlayer();
    player.getCurrentTime = vi.fn().mockResolvedValue(0);
    await service.attachPlayer(player);
    await service.load(createDemoItem());
    seek.mockClear();

    await vi.advanceTimersByTimeAsync(500);
    expect(seek).not.toHaveBeenCalled();

    await service.start();
    seek.mockClear();
    player.getCurrentTime = vi.fn().mockResolvedValue(5);
    await vi.advanceTimersByTimeAsync(500);
    expect(seek).toHaveBeenCalledWith(0);
  });

  it('auto-advances when timed step elapses after start', async () => {
    const { player } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(createDemoItem());
    await service.start();

    await vi.advanceTimersByTimeAsync(2100);
    expect(service.snapshot.selectedIndex).toBe(1);
  });

  it('completes after next on the final step', async () => {
    const { player } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(createDemoItem());
    await service.start();
    await service.selectStep(1);
    await service.next();
    expect(service.snapshot.phase).toBe('completed');
    expect(player.pause).toHaveBeenCalled();
  });

  it('pause and resume couple video and timer', async () => {
    const { player } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(createDemoItem());
    await service.start();

    await service.pause();
    expect(service.snapshot.phase).toBe('paused');
    expect(player.pause).toHaveBeenCalled();

    await service.resume();
    expect(service.snapshot.phase).toBe('playing');
    expect(player.play).toHaveBeenCalled();
  });

  it('suspend/resume visual keeps the activity timer running', async () => {
    const { player, kickstartFromUserGesture, pause } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(createDemoItem());
    await service.start();

    await vi.advanceTimersByTimeAsync(800);
    const remainingBefore = service.snapshot.remainingSeconds;

    await service.suspendVisualKeepSession();
    expect(pause).toHaveBeenCalled();
    expect(service.snapshot.phase).toBe('playing');

    await vi.advanceTimersByTimeAsync(500);
    expect(service.snapshot.remainingSeconds).toBeLessThan(remainingBefore!);

    const remainingBeforeResume = service.snapshot.remainingSeconds;
    kickstartFromUserGesture.mockClear();
    service.resumeVisualKeepSessionFromUserGesture();

    expect(kickstartFromUserGesture).toHaveBeenCalled();
    expect(service.snapshot.phase).toBe('playing');
    expect(service.snapshot.remainingSeconds).toBe(remainingBeforeResume);
  });

  it('does not start the activity timer until a 2Hz playing check succeeds', async () => {
    const { player, isPlaying } = createMockPlayer({ playing: false });
    await service.attachPlayer(player);
    await service.load(createDemoItem());

    const startPromise = service.start();
    await Promise.resolve();

    expect(service.snapshot.phase).toBe('playing');
    expect(service.snapshot.remainingSeconds).toBe(2);

    await vi.advanceTimersByTimeAsync(500);
    expect(service.snapshot.remainingSeconds).toBe(2);

    isPlaying.next(true);
    await vi.advanceTimersByTimeAsync(500);
    await startPromise;

    await vi.advanceTimersByTimeAsync(2100);
    expect(service.snapshot.selectedIndex).toBe(1);
  });

  it('retries play while waiting, then starts the timer if the video never reports playing', async () => {
    const { player, play } = createMockPlayer({ playing: false });
    await service.attachPlayer(player);
    await service.load(createDemoItem());

    const startPromise = service.start();

    // A play command dropped before the embed was listening gets re-issued.
    await vi.advanceTimersByTimeAsync(1000);
    expect(play).toHaveBeenCalled();
    expect(service.snapshot.remainingSeconds).toBe(2);

    await vi.advanceTimersByTimeAsync(2000);
    await startPromise;

    expect(service.snapshot.remainingSeconds).toBe(2);
    await vi.advanceTimersByTimeAsync(2100);
    expect(service.snapshot.selectedIndex).toBe(1);
  });

  it('inserts a between-step gap before auto-advancing', async () => {
    const { player } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(
      createDemoItem({
        gapSeconds: 2,
        gapMessage: 'Active recovery',
        steps: [
          {
            id: 's1',
            order: 1,
            title: 'One',
            startSeconds: 0,
            endSeconds: 5,
            durationSeconds: 1,
            autoAdvance: true,
          },
          {
            id: 's2',
            order: 2,
            title: 'Two',
            startSeconds: 5,
            endSeconds: 10,
            durationSeconds: 1,
            autoAdvance: true,
          },
        ],
      }),
    );
    await service.start();

    await vi.advanceTimersByTimeAsync(1100);
    expect(service.snapshot.phase).toBe('gap');
    expect(service.snapshot.gapActive).toBe(true);
    expect(service.snapshot.startGapActive).toBe(false);
    expect(service.snapshot.selectedIndex).toBe(1);
    expect(service.snapshot.selectedStep?.title).toBe('Two');
    expect(service.snapshot.remainingSeconds).toBe(2);

    await vi.advanceTimersByTimeAsync(2100);
    expect(service.snapshot.phase).toBe('playing');
    expect(service.snapshot.gapActive).toBe(false);
    expect(service.snapshot.selectedIndex).toBe(1);
  });

  it('skips the gap when jumping with selectStep', async () => {
    const { player } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(createDemoItem({ gapSeconds: 30 }));
    await service.start();
    await service.selectStep(1);

    expect(service.snapshot.phase).toBe('playing');
    expect(service.snapshot.gapActive).toBe(false);
    expect(service.snapshot.selectedIndex).toBe(1);
  });

  it('starts the next clip immediately when the gap is 15 seconds or less', async () => {
    const { player, play, seek } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(
      createDemoItem({
        gapSeconds: 5,
        steps: [
          {
            id: 's1',
            order: 1,
            title: 'One',
            startSeconds: 0,
            endSeconds: 5,
            durationSeconds: 1,
            autoAdvance: true,
          },
          {
            id: 's2',
            order: 2,
            title: 'Two',
            startSeconds: 8,
            endSeconds: 12,
            durationSeconds: 1,
            autoAdvance: true,
          },
        ],
      }),
    );
    await service.start();
    play.mockClear();
    seek.mockClear();

    await vi.advanceTimersByTimeAsync(1100);
    expect(service.snapshot.phase).toBe('gap');
    expect(seek).toHaveBeenCalledWith(8);
    expect(play).toHaveBeenCalled();
  });

  it('starts the next clip in the last 10 seconds when the gap is longer than 15 seconds', async () => {
    const { player, play, seek } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(
      createDemoItem({
        gapSeconds: 20,
        steps: [
          {
            id: 's1',
            order: 1,
            title: 'One',
            startSeconds: 0,
            endSeconds: 5,
            durationSeconds: 1,
            autoAdvance: true,
          },
          {
            id: 's2',
            order: 2,
            title: 'Two',
            startSeconds: 8,
            endSeconds: 12,
            durationSeconds: 1,
            autoAdvance: true,
          },
        ],
      }),
    );
    await service.start();
    play.mockClear();
    seek.mockClear();

    await vi.advanceTimersByTimeAsync(1100);
    expect(service.snapshot.phase).toBe('gap');
    expect(service.snapshot.remainingSeconds).toBe(20);
    expect(play).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(9000);
    expect(service.snapshot.phase).toBe('gap');
    expect(play).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(service.snapshot.remainingSeconds).toBe(10);
    expect(seek).toHaveBeenCalledWith(8);
    expect(play).toHaveBeenCalled();
    expect(service.snapshot.phase).toBe('gap');
  });

  it('runs a gap entry with its own length and message', async () => {
    const { player } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(
      createDemoItem({
        gapSeconds: 30,
        gapMessage: 'Item default',
        steps: [
          {
            id: 's1',
            order: 1,
            kind: 'step',
            title: 'One',
            startSeconds: 0,
            endSeconds: 5,
            durationSeconds: 1,
            autoAdvance: true,
          },
          {
            id: 'g1',
            order: 2,
            kind: 'gap',
            title: '',
            startSeconds: 0,
            endSeconds: 0,
            durationSeconds: 2,
            autoAdvance: true,
            message: 'Shake it out',
          },
          {
            id: 's2',
            order: 3,
            kind: 'step',
            title: 'Two',
            startSeconds: 5,
            endSeconds: 10,
            durationSeconds: 1,
            autoAdvance: true,
          },
        ],
      }),
    );
    await service.start();

    await vi.advanceTimersByTimeAsync(1100);
    expect(service.snapshot.phase).toBe('gap');
    expect(service.snapshot.remainingSeconds).toBe(2);
    expect(service.snapshot.gapMessage).toBe('Shake it out');
    expect(service.snapshot.selectedStep?.title).toBe('Two');
    expect(service.snapshot.stepNumber).toBe(2);
    expect(service.snapshot.stepCount).toBe(2);

    await vi.advanceTimersByTimeAsync(2100);
    expect(service.snapshot.phase).toBe('playing');
    expect(service.snapshot.selectedIndex).toBe(2);
    expect(service.snapshot.gapMessage).toBeNull();
  });

  it('completes when only a trailing gap follows the last step', async () => {
    const { player } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(
      createDemoItem({
        steps: [
          {
            id: 's1',
            order: 1,
            kind: 'step',
            title: 'One',
            startSeconds: 0,
            endSeconds: 5,
            durationSeconds: 1,
            autoAdvance: true,
          },
          {
            id: 'g1',
            order: 2,
            kind: 'gap',
            title: '',
            startSeconds: 0,
            endSeconds: 0,
            durationSeconds: 10,
            autoAdvance: true,
          },
        ],
      }),
    );
    await service.start();

    await vi.advanceTimersByTimeAsync(1100);
    expect(service.snapshot.phase).toBe('completed');
  });

  it('selects by navigator position, skipping gap entries', async () => {
    const { player } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(
      createDemoItem({
        steps: [
          {
            id: 'g0',
            order: 1,
            kind: 'gap',
            title: '',
            startSeconds: 0,
            endSeconds: 0,
            durationSeconds: 5,
            autoAdvance: true,
          },
          {
            id: 's1',
            order: 2,
            kind: 'step',
            title: 'One',
            startSeconds: 0,
            endSeconds: 5,
            durationSeconds: 2,
            autoAdvance: true,
          },
          {
            id: 'g1',
            order: 3,
            kind: 'gap',
            title: '',
            startSeconds: 0,
            endSeconds: 0,
            durationSeconds: 5,
            autoAdvance: true,
          },
          {
            id: 's2',
            order: 4,
            kind: 'step',
            title: 'Two',
            startSeconds: 5,
            endSeconds: 10,
            durationSeconds: 2,
            autoAdvance: true,
          },
        ],
      }),
    );

    // A leading gap is skipped when preparing the first step.
    expect(service.snapshot.selectedIndex).toBe(1);
    expect(service.snapshot.stepNumber).toBe(1);
    expect(service.snapshot.stepCount).toBe(2);

    await service.selectActivityStep(1);
    expect(service.snapshot.selectedIndex).toBe(3);
    expect(service.snapshot.stepNumber).toBe(2);

    await service.previous();
    expect(service.snapshot.selectedIndex).toBe(1);
  });

  it('can pause and resume a between-step gap', async () => {
    const { player } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(
      createDemoItem({
        gapSeconds: 5,
        steps: [
          {
            id: 's1',
            order: 1,
            title: 'One',
            startSeconds: 0,
            endSeconds: 5,
            durationSeconds: 1,
            autoAdvance: true,
          },
          {
            id: 's2',
            order: 2,
            title: 'Two',
            startSeconds: 5,
            endSeconds: 10,
            durationSeconds: 1,
            autoAdvance: true,
          },
        ],
      }),
    );
    await service.start();
    await vi.advanceTimersByTimeAsync(1100);
    expect(service.snapshot.phase).toBe('gap');

    await service.pause();
    expect(service.snapshot.phase).toBe('paused');
    expect(service.snapshot.gapActive).toBe(true);
    const remaining = service.snapshot.remainingSeconds;

    await vi.advanceTimersByTimeAsync(2000);
    expect(service.snapshot.remainingSeconds).toBe(remaining);

    await service.resume();
    expect(service.snapshot.phase).toBe('gap');
  });

  it('plays a demo gap before the first timer when playGapPriorToStart is on', async () => {
    const { player, kickstartFromUserGesture } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(
      createDemoItem({
        playGapPriorToStart: true,
        gapSeconds: 2,
        gapMessage: 'Watch the demo',
      }),
    );
    await service.start();

    expect(kickstartFromUserGesture).toHaveBeenCalledWith(0, { muted: false });
    expect(service.snapshot.phase).toBe('gap');
    expect(service.snapshot.gapActive).toBe(true);
    expect(service.snapshot.startGapActive).toBe(true);
    expect(service.snapshot.selectedIndex).toBe(0);
    expect(service.snapshot.gapMessage).toBe('Watch the demo');
    expect(service.snapshot.remainingSeconds).toBe(2);

    await vi.advanceTimersByTimeAsync(2100);
    expect(service.snapshot.phase).toBe('playing');
    expect(service.snapshot.gapActive).toBe(false);
    expect(service.snapshot.isTimedStep).toBe(true);
  });

  it('uses startGapSeconds for the intro when it is set', async () => {
    const { player } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(
      createDemoItem({
        playGapPriorToStart: true,
        gapSeconds: 2,
        startGapSeconds: 8,
      }),
    );
    await service.start();

    expect(service.snapshot.phase).toBe('gap');
    expect(service.snapshot.remainingSeconds).toBe(8);
  });

  it('uses the start gap message for the intro when it is set', async () => {
    const { player } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(
      createDemoItem({
        playGapPriorToStart: true,
        gapSeconds: 2,
        gapMessage: 'Between steps',
        startGapSeconds: 8,
        startGapMessage: 'Watch the demo',
      }),
    );
    await service.start();

    expect(service.snapshot.phase).toBe('gap');
    expect(service.snapshot.remainingSeconds).toBe(8);
    expect(service.snapshot.gapMessage).toBe('Watch the demo');
  });

  it('skips the intro when playGapPriorToStart is on but no gap length is set', async () => {
    const { player } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(createDemoItem({ playGapPriorToStart: true }));
    await service.start();

    expect(service.snapshot.phase).toBe('playing');
    expect(service.snapshot.gapActive).toBe(false);
  });

  it('holds an untimed play-once clip after it ends', async () => {
    const { player, pause } = createMockPlayer();
    vi.mocked(player.getCurrentTime).mockResolvedValue(6);
    await service.attachPlayer(player);
    await service.load(
      createDemoItem({
        steps: [
          {
            id: 's1',
            order: 1,
            title: 'Dice',
            description: 'Keep the pieces even.',
            startSeconds: 0,
            endSeconds: 5,
            durationSeconds: null,
            autoAdvance: false,
            loopVideo: false,
          },
        ],
      }),
    );
    await service.start();
    expect(service.snapshot.phase).toBe('playing');
    expect(service.snapshot.clipHoldActive).toBe(false);

    await vi.advanceTimersByTimeAsync(500);
    expect(service.snapshot.clipHoldActive).toBe(true);
    expect(pause).toHaveBeenCalled();
  });
});
