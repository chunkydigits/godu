import { describe, expect, it } from 'vitest';
import { StepsItemStatus } from './steps-item-status.enum';
import { StepsVisibility } from './steps-visibility.enum';
import { VideoProvider } from './video-provider.enum';
import { DemoStepsItem } from './demo-steps-item.model';
import {
  associatedGoduImportMessage,
  planAssociatedGoduImport,
  tiktokHandlesForAccount,
} from './associated-godu-import';

describe('associated Godu import', () => {
  it('includes aliases when matching a linked TikTok', () => {
    expect(
      tiktokHandlesForAccount({
        username: 'CoachNow',
        usernameAliases: ['@oldcoach', 'CoachNow'],
      }),
    ).toEqual(['coachnow', 'oldcoach']);
  });

  it('imports matching demos with their category and public Godus without one', () => {
    const plan = planAssociatedGoduImport({
      handles: ['coach'],
      published: [
        {
          id: 'steps_public',
          title: 'Mobility',
          publicPath: '/t/coach/mobility',
          username: 'coach',
        },
      ],
      demos: [demo({ id: 'steps_demo_train', category: 'Train' })],
      alreadySavedIds: new Set(),
    });

    expect(plan.found).toBe(2);
    expect(plan.toImport).toEqual([
      expect.objectContaining({
        goduId: 'steps_demo_train',
        playPath: '/play/steps_demo_train',
        category: 'Train',
      }),
      expect.objectContaining({
        goduId: 'steps_public',
        playPath: '/t/coach/mobility',
        category: null,
      }),
    ]);
  });

  it('skips Godus that are already saved', () => {
    const plan = planAssociatedGoduImport({
      handles: ['coach'],
      published: [{ id: 'steps_public', title: 'Mobility', publicPath: '/t/coach/mobility' }],
      demos: [demo()],
      alreadySavedIds: new Set(['steps_demo_train', 'steps_public']),
    });

    expect(plan.found).toBe(2);
    expect(plan.toImport).toEqual([]);
  });

  it('describes the import outcome', () => {
    expect(associatedGoduImportMessage('coach', 0, 0)).toBe('No public Godus found for @coach.');
    expect(associatedGoduImportMessage('coach', 2, 0)).toBe(
      'All 2 Godus for @coach are already in Saved.',
    );
    expect(associatedGoduImportMessage('coach', 2, 2)).toBe('Imported 2 Godus into Saved.');
  });
});

function demo(overrides: Partial<DemoStepsItem> = {}): DemoStepsItem {
  return {
    id: 'steps_demo_train',
    category: 'Train',
    listed: true,
    createdByUserId: 'usr_demo',
    visibility: StepsVisibility.Public,
    status: StepsItemStatus.Published,
    title: 'HIIT',
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
