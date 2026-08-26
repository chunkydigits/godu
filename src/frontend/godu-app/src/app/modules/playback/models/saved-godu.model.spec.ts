import { describe, expect, it } from 'vitest';
import { StepsItemStatus } from './steps-item-status.enum';
import { StepsVisibility } from './steps-visibility.enum';
import { VideoProvider } from './video-provider.enum';
import { canSaveGodu, toSaveGoduRequest } from './saved-godu.model';
import { StepsItem } from './steps-item.model';

describe('saved Godu mapping', () => {
  it('allows a public Godu once for a signed-in user', () => {
    expect(
      canSaveGodu({
        authenticated: true,
        alreadySaved: false,
        isDemo: false,
        visibility: StepsVisibility.Public,
      }),
    ).toBe(true);
  });

  it('hides save when the Godu is already saved or private', () => {
    expect(
      canSaveGodu({
        authenticated: true,
        alreadySaved: true,
        isDemo: false,
        visibility: StepsVisibility.Public,
      }),
    ).toBe(false);
    expect(
      canSaveGodu({
        authenticated: true,
        alreadySaved: false,
        isDemo: false,
        visibility: StepsVisibility.Private,
      }),
    ).toBe(false);
  });

  it('allows catalogue demos even when their stored visibility is private', () => {
    expect(
      canSaveGodu({
        authenticated: true,
        alreadySaved: false,
        isDemo: true,
        visibility: StepsVisibility.Private,
      }),
    ).toBe(true);
  });

  it('stores a pointer to the play path rather than copying the Godu', () => {
    const request = toSaveGoduRequest(
      item({
        visibility: StepsVisibility.Public,
        publicPath: '/t/coach/mobility',
      }),
      false,
      'Train',
    );
    expect(request).toEqual({
      goduId: 'steps_1',
      title: 'Morning',
      creatorDisplayName: null,
      playPath: '/t/coach/mobility',
      category: 'Train',
    });
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
