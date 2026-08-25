import { describe, expect, it } from 'vitest';
import { StepsItemStatus } from './steps-item-status.enum';
import { StepsVisibility } from './steps-visibility.enum';
import { VideoProvider } from './video-provider.enum';
import { playHistoryPath, playHistorySource, playHistoryStepsSummary, playHistoryTimeSummary, toRecordPlayHistoryRequest } from './play-history.model';
import { StepsItem } from './steps-item.model';

describe('play history mapping', () => {
  it('uses the demo play route for catalogue demos', () => {
    expect(playHistoryPath(item(), true)).toBe('/play/steps_1');
    expect(playHistorySource(item(), true)).toBe('demo');
  });

  it('prefers the public creator URL', () => {
    const publicItem = item({
      visibility: StepsVisibility.Public,
      slug: 'mobility',
      publicPath: '/t/coach/mobility',
    });
    expect(playHistoryPath(publicItem, false)).toBe('/t/coach/mobility');
    expect(playHistorySource(publicItem, false)).toBe('public');
  });

  it('falls back to the library play route', () => {
    expect(playHistoryPath(item(), false)).toBe('/play/steps_1');
    expect(playHistorySource(item(), false)).toBe('library');
  });

  it('includes the last session on a completed record', () => {
    const request = toRecordPlayHistoryRequest(item(), 'completed', false, {
      stepCount: 5,
      iterationCount: 7,
      elapsedSeconds: 94,
    });
    expect(request.stepCount).toBe(5);
    expect(request.iterationCount).toBe(7);
    expect(request.elapsedSeconds).toBe(94);
  });

  it('omits the session snapshot when the event is started', () => {
    const request = toRecordPlayHistoryRequest(item(), 'started', false, {
      stepCount: 5,
      iterationCount: 7,
      elapsedSeconds: 94,
    });
    expect(request.stepCount).toBeUndefined();
    expect(request.iterationCount).toBeUndefined();
    expect(request.elapsedSeconds).toBeUndefined();
  });

  it('formats Godu’n copy from the last completed session', () => {
    expect(
      playHistoryStepsSummary({
        goduId: 'steps_1',
        title: 'HIIT',
        playPath: '/play/steps_1',
        source: 'demo',
        startedCount: 1,
        completedCount: 1,
        lastStartedUtc: '2026-08-25T00:00:00Z',
        lastStepCount: 5,
        lastIterationCount: 7,
      }),
    ).toBe('5 steps, 7 iterations');
    expect(
      playHistoryTimeSummary({
        goduId: 'steps_1',
        title: 'HIIT',
        playPath: '/play/steps_1',
        source: 'demo',
        startedCount: 1,
        completedCount: 1,
        lastStartedUtc: '2026-08-25T00:00:00Z',
        lastElapsedSeconds: 94,
      }),
    ).toBe('It took 1 minute 34 seconds.');
    expect(
      playHistoryStepsSummary({
        goduId: 'steps_1',
        title: 'HIIT',
        playPath: '/play/steps_1',
        source: 'demo',
        startedCount: 1,
        completedCount: 0,
        lastStartedUtc: '2026-08-25T00:00:00Z',
        lastStepCount: 5,
      }),
    ).toBeNull();
  });
});

function item(overrides: Partial<StepsItem> = {}): StepsItem {
  return {
    id: 'steps_1',
    createdByUserId: 'usr_1',
    visibility: StepsVisibility.Private,
    status: StepsItemStatus.Published,
    title: 'Morning',
    video: {
      provider: VideoProvider.TikTok,
      externalVideoId: '1',
      sourceUrl: 'https://www.tiktok.com/@coach/video/1',
      creatorUsername: 'coach',
    },
    steps: [],
    createdUtc: '2026-08-21T00:00:00Z',
    ...overrides,
  };
}
