import { describe, expect, it } from 'vitest';
import { mapApiStepsItem } from './api-steps-item.mapper';
import { ApiStepsItem } from './api-steps-item.model';
import { StepsItemStatus } from './steps-item-status.enum';
import { StepsVisibility } from './steps-visibility.enum';
import { VideoProvider } from './video-provider.enum';

describe('mapApiStepsItem', () => {
  it('maps API DTO fields into domain StepsItem', () => {
    const api: ApiStepsItem = {
      id: 'steps_1',
      createdByUserId: 'usr_1',
      linkedPlatformAccountId: null,
      visibility: 'private',
      status: 'published',
      slug: null,
      title: 'Mobility',
      description: 'Demo',
      creatorDisplayName: '@coach',
      continuousSoundtrack: false,
      gapSeconds: 15,
      gapMessage: 'Active recovery — keep moving',
      createdUtc: '2026-08-14T12:00:00Z',
      updatedUtc: '2026-08-14T12:00:00Z',
      publishedUtc: '2026-08-14T12:00:00Z',
      video: {
        provider: 'tiktok',
        externalVideoId: '1234567890',
        sourceUrl: 'https://www.tiktok.com/@coach/video/1234567890',
        creatorUsername: 'coach',
        durationSeconds: 40,
      },
      steps: [
        {
          id: 'step_1',
          order: 1,
          title: 'Warm up',
          description: null,
          startSeconds: 0,
          endSeconds: 5,
          durationSeconds: 10,
          autoAdvance: true,
        },
      ],
    };

    const item = mapApiStepsItem(api);

    expect(item.id).toBe('steps_1');
    expect(item.visibility).toBe(StepsVisibility.Private);
    expect(item.status).toBe(StepsItemStatus.Published);
    expect(item.video.provider).toBe(VideoProvider.TikTok);
    expect(item.video.externalVideoId).toBe('1234567890');
    expect(item.steps).toHaveLength(1);
    expect(item.steps[0].title).toBe('Warm up');
    expect(item.steps[0].description).toBeUndefined();
    expect(item.gapSeconds).toBe(15);
    expect(item.gapMessage).toBe('Active recovery — keep moving');
  });
});
