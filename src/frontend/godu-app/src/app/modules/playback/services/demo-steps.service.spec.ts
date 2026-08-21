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
    ]);
    expect(listed.every((item) => item.listed && item.category)).toBe(true);
    expect(listed.some((item) => item.id === 'steps_demo_fitness_core')).toBe(false);
  });

  it('maps catalogue demos including gap entries', async () => {
    const study = await firstValueFrom(service.getById('steps_demo_learn_study'));
    expect(study.category).toBe('Learn');
    expect(study.video.externalVideoId).toBe('6708742129562160389');
    expect(study.steps.some((step) => step.kind === 'gap' && step.message === 'Take a five-minute break')).toBe(
      true,
    );
  });

  it('returns other items from the same creator', async () => {
    const fitness = await firstValueFrom(service.getById('steps_demo_fitness'));
    const related = await firstValueFrom(service.getRelatedByCreator(fitness));
    expect(related.length).toBeGreaterThan(0);
    expect(related.every((x) => x.video.creatorUsername === 'mydisciplinedrive')).toBe(
      true,
    );
    expect(related.some((x) => x.id === 'steps_demo_fitness')).toBe(false);
  });
});
