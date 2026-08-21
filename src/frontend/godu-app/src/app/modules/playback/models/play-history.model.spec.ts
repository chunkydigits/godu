import { describe, expect, it } from 'vitest';
import { StepsItemStatus } from './steps-item-status.enum';
import { StepsVisibility } from './steps-visibility.enum';
import { VideoProvider } from './video-provider.enum';
import { playHistoryPath, playHistorySource } from './play-history.model';
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
