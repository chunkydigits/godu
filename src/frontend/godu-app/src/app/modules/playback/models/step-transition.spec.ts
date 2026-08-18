import { describe, expect, it } from 'vitest';
import { StepDefinition } from './step-definition.model';
import { StepsItem } from './steps-item.model';
import { StepsItemStatus } from './steps-item-status.enum';
import { StepsVisibility } from './steps-visibility.enum';
import { VideoProvider } from './video-provider.enum';
import { resolveStepTransition } from './step-transition';

function activity(id: string): StepDefinition {
  return {
    id,
    order: 1,
    kind: 'step',
    title: id,
    startSeconds: 0,
    endSeconds: 5,
    durationSeconds: 30,
    autoAdvance: true,
  };
}

function gap(seconds: number, message?: string): StepDefinition {
  return {
    id: `gap_${seconds}`,
    order: 2,
    kind: 'gap',
    title: '',
    startSeconds: 0,
    endSeconds: 0,
    durationSeconds: seconds,
    autoAdvance: true,
    message: message ?? null,
  };
}

function item(steps: StepDefinition[], overrides: Partial<StepsItem> = {}): StepsItem {
  return {
    id: 'steps_1',
    createdByUserId: 'usr_1',
    visibility: StepsVisibility.Private,
    status: StepsItemStatus.Published,
    title: 'Test',
    video: {
      provider: VideoProvider.TikTok,
      externalVideoId: '123',
      sourceUrl: 'https://www.tiktok.com/@x/video/123',
    },
    steps,
    createdUtc: '2026-08-18T08:00:00Z',
    ...overrides,
  };
}

describe('resolveStepTransition', () => {
  it('runs a gap entry before the step that follows it', () => {
    const transition = resolveStepTransition(
      item([activity('a'), gap(20, '  Breathe  '), activity('b')]),
      0,
    );

    expect(transition).toEqual({ nextIndex: 2, gapSeconds: 20, gapMessage: 'Breathe' });
  });

  it('falls back to the item default when no gap entry sits between steps', () => {
    const transition = resolveStepTransition(
      item([activity('a'), activity('b')], { gapSeconds: 15, gapMessage: 'Rest up' }),
      0,
    );

    expect(transition).toEqual({ nextIndex: 1, gapSeconds: 15, gapMessage: 'Rest up' });
  });

  it('lets a gap entry override the item default', () => {
    const transition = resolveStepTransition(
      item([activity('a'), gap(5), activity('b')], {
        gapSeconds: 60,
        gapMessage: 'Ignored',
      }),
      0,
    );

    expect(transition).toEqual({ nextIndex: 2, gapSeconds: 5, gapMessage: null });
  });

  it('adds consecutive gaps together and keeps the first message', () => {
    const transition = resolveStepTransition(
      item([activity('a'), gap(5), gap(10, 'Second'), activity('b')]),
      0,
    );

    expect(transition).toEqual({ nextIndex: 3, gapSeconds: 15, gapMessage: 'Second' });
  });

  it('reports no next step when only gaps remain', () => {
    const transition = resolveStepTransition(item([activity('a'), gap(30)]), 0);

    expect(transition).toEqual({ nextIndex: null, gapSeconds: 0, gapMessage: null });
  });

  it('carries no gap when neither an entry nor a default is set', () => {
    const transition = resolveStepTransition(item([activity('a'), activity('b')]), 0);

    expect(transition).toEqual({ nextIndex: 1, gapSeconds: 0, gapMessage: null });
  });
});
