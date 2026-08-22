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
      publicPath: '/t/coach/mobility',
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
    expect(item.playGapPriorToStart).toBe(false);
    expect(item.startGapSeconds).toBeNull();
    expect(item.startGapMessage).toBeNull();
    expect(item.steps[0].loopVideo).toBe(true);
    expect(item.publicPath).toBe('/t/coach/mobility');
  });

  it('builds a public path when the API omitted it', () => {
    const api: ApiStepsItem = {
      id: 'steps_3',
      createdByUserId: 'usr_1',
      visibility: 'public',
      status: 'published',
      slug: 'circuit',
      title: 'Circuit',
      continuousSoundtrack: false,
      createdUtc: '2026-08-18T08:00:00Z',
      updatedUtc: '2026-08-18T08:00:00Z',
      video: {
        provider: 'tiktok',
        externalVideoId: '1234567890',
        sourceUrl: 'https://www.tiktok.com/@coach/video/1234567890',
        creatorUsername: 'coach',
      },
      steps: [],
    };

    expect(mapApiStepsItem(api).publicPath).toBe('/t/coach/circuit');
  });

  it('maps gap entries and defaults a missing kind to step', () => {
    const api: ApiStepsItem = {
      id: 'steps_2',
      createdByUserId: 'usr_1',
      visibility: 'private',
      status: 'published',
      title: 'Circuit',
      continuousSoundtrack: false,
      createdUtc: '2026-08-18T08:00:00Z',
      updatedUtc: '2026-08-18T08:00:00Z',
      video: {
        provider: 'tiktok',
        externalVideoId: '1234567890',
        sourceUrl: 'https://www.tiktok.com/@coach/video/1234567890',
      },
      steps: [
        {
          id: 'step_1',
          order: 1,
          title: 'Squats',
          startSeconds: 0,
          endSeconds: 5,
          durationSeconds: 30,
          autoAdvance: true,
        },
        {
          id: 'step_2',
          order: 2,
          kind: 'gap',
          title: '',
          startSeconds: 0,
          endSeconds: 0,
          durationSeconds: 20,
          autoAdvance: true,
          message: 'Water break',
        },
      ],
    };

    const item = mapApiStepsItem(api);

    expect(item.steps[0].kind).toBe('step');
    expect(item.steps[1].kind).toBe('gap');
    expect(item.steps[1].durationSeconds).toBe(20);
    expect(item.steps[1].message).toBe('Water break');
  });
});
