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

function createMockPlayer() {
  const ready = new BehaviorSubject(true);
  const timeUpdates = new Subject<VideoPlayerTimeUpdate>();
  const seek = vi.fn().mockResolvedValue(undefined);
  const play = vi.fn().mockResolvedValue(undefined);
  const pause = vi.fn().mockResolvedValue(undefined);
  const kickstartFromUserGesture = vi.fn();
  const setMuted = vi.fn();
  const player: ControllableVideoPlayer = {
    ready: ready.asObservable(),
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
  return { player, timeUpdates, seek, play, pause, kickstartFromUserGesture, setMuted };
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
    const { player, timeUpdates, seek } = createMockPlayer();
    await service.attachPlayer(player);
    await service.load(createDemoItem());
    seek.mockClear();

    timeUpdates.next({ currentTime: 5, duration: 60 });
    expect(seek).not.toHaveBeenCalled();

    await service.start();
    seek.mockClear();
    timeUpdates.next({ currentTime: 5, duration: 60 });
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
});
