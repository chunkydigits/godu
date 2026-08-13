import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { BehaviorSubject, Subject } from 'rxjs';
import { StepsItem } from '../models/steps-item.model';
import { StepsItemStatus } from '../models/steps-item-status.enum';
import { StepsVisibility } from '../models/steps-visibility.enum';
import { VideoProvider } from '../models/video-provider.enum';
import {
  ControllableVideoPlayer,
  VideoPlayerTimeUpdate,
} from '../models/video-player.interface';
import { StepPlaybackService } from './step-playback.service';

function createDemoItem(): StepsItem {
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
  };
}

function createMockPlayer() {
  const ready = new BehaviorSubject(true);
  const timeUpdates = new Subject<VideoPlayerTimeUpdate>();
  const seek = vi.fn().mockResolvedValue(undefined);
  const play = vi.fn().mockResolvedValue(undefined);
  const kickstartFromUserGesture = vi.fn();
  const player: ControllableVideoPlayer = {
    ready: ready.asObservable(),
    timeUpdates: timeUpdates.asObservable(),
    initialise: vi.fn().mockResolvedValue(undefined),
    play,
    pause: vi.fn().mockResolvedValue(undefined),
    seek,
    getCurrentTime: vi.fn().mockResolvedValue(0),
    destroy: vi.fn().mockResolvedValue(undefined),
    kickstartFromUserGesture,
  };
  return { player, timeUpdates, seek, play, kickstartFromUserGesture };
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

    expect(kickstartFromUserGesture).toHaveBeenCalledWith(0);
    expect(service.snapshot.phase).toBe('playing');
    // Initial start uses kickstart; play() is for later step changes / resume
    expect(play).not.toHaveBeenCalled();
    expect(service.snapshot.isTimedStep).toBe(true);
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
});
