import { describe, expect, it } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { DemoStepsService } from './demo-steps.service';

describe('DemoStepsService related', () => {
  const service = new DemoStepsService();

  it('lists only catalogue demos with a category', async () => {
    const listed = await firstValueFrom(service.list());
    expect(listed.map((item) => item.id)).toEqual([
      'steps_demo_fitness',
      'steps_demo_recipe',
      'steps_demo_cook_confit',
      'steps_demo_train_hiit',
      'steps_demo_style_plait',
      'steps_demo_dance_pop',
      'steps_demo_makeup_baddie',
      'steps_demo_fix_hinge',
      'steps_demo_make_granny',
      'steps_demo_play_restless',
      'steps_demo_care_skincare',
      'steps_demo_learn_study',
      'steps_demo_learn_writing',
    ]);
    expect(listed.every((item) => item.listed && item.category)).toBe(true);
    expect(listed.some((item) => item.id === 'steps_demo_fitness_core')).toBe(false);
  });

  it('uses the Nicci Robinson HIIT circuit with seven repeats', async () => {
    const hiit = await firstValueFrom(service.getById('steps_demo_train_hiit'));
    expect(hiit.video.externalVideoId).toBe('7457632822598159658');
    expect(hiit.repeatCount).toBe(7);
    expect(hiit.gapSeconds).toBeNull();
    expect(hiit.steps).toHaveLength(6);
    expect(hiit.steps.map((step) => step.title)).toEqual([
      'Squat to Knee',
      '3 Pulse Squats into a Calf Raise',
      'Sprawlee',
      'Jump Lunges',
      'Cross Jab Squats',
      'Rest',
    ]);
    expect(hiit.steps[5]).toMatchObject({
      kind: 'step',
      durationSeconds: 60,
      loopVideo: false,
    });
  });

  it('maps catalogue demos including gap entries', async () => {
    const study = await firstValueFrom(service.getById('steps_demo_learn_study'));
    expect(study.category).toBe('Learn');
    expect(study.video.externalVideoId).toBe('6708742129562160389');
    expect(study.steps.some((step) => step.kind === 'gap' && step.message === 'Take a five-minute break')).toBe(
      true,
    );
  });

  it('maps a cards-only writing timer with no TikTok', async () => {
    const writing = await firstValueFrom(service.getById('steps_demo_learn_writing'));
    expect(writing.category).toBe('Learn');
    expect(writing.useVideoContent).toBe(false);
    expect(writing.video.provider).toBe('none');
    expect(writing.steps.map((step) => step.kind)).toEqual(['card', 'gap', 'card']);
    expect(writing.steps[0]).toMatchObject({
      message: 'Planning',
      durationSeconds: 300,
      backgroundColor: '#02C998',
    });
    expect(writing.steps[2]).toMatchObject({
      message: 'Write the creative writing piece',
      durationSeconds: 900,
    });
  });

  it('does not invent related items for a cards-only demo', async () => {
    const writing = await firstValueFrom(service.getById('steps_demo_learn_writing'));
    const related = await firstValueFrom(service.getRelatedByCreator(writing));
    expect(related).toEqual([]);
  });
});
