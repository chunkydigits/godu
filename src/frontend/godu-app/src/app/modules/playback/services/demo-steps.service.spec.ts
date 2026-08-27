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

  it('uses the notorious_foodie confit recipe steps', async () => {
    const confit = await firstValueFrom(service.getById('steps_demo_cook_confit'));
    expect(confit.video.externalVideoId).toBe('7179661469712174342');
    expect(confit.gapSeconds).toBeNull();
    expect(confit.steps).toHaveLength(18);
    expect(confit.steps.map((step) => step.title)).toEqual([
      'Cut the wagyu',
      'Finely dice the shallot',
      'Cut the pickles',
      'Finely chop the capers',
      'Mince the anchovies',
      'Finely chop the parsley',
      'Finely chop the chives',
      'Season and mix',
      'Peel and slice the potatoes',
      'Season the potatoes',
      'Melt 3 tablespoons of duck-fat in the microwave',
      'Mix and layer the potatoes',
      'Oven bake, compress and chill',
      'Turn out and cut the potato',
      'Eat some caviar',
      'Deep fry the Confit Potato',
      'Plate up',
      'Enjoy',
    ]);
    expect(confit.steps[0]).toMatchObject({
      kind: 'step',
      startSeconds: 0,
      endSeconds: 8.5,
      durationSeconds: null,
      autoAdvance: false,
      loopVideo: false,
    });
    expect(confit.steps[17]).toMatchObject({
      startSeconds: 88.5,
      endSeconds: 94,
    });
  });

  it('uses the theellapatt knotless braid steps', async () => {
    const plait = await firstValueFrom(service.getById('steps_demo_style_plait'));
    expect(plait.video.externalVideoId).toBe('7601240724440616214');
    expect(plait.title).toBe('Starting knotless braids from @theellapatt');
    expect(plait.gapSeconds).toBeNull();
    expect(plait.steps).toHaveLength(3);
    expect(plait.steps.map((step) => step.title)).toEqual([
      'Attaching the extension',
      'Grip the hair and extensions',
      'Start plaiting',
    ]);
    expect(plait.steps[0]).toMatchObject({
      startSeconds: 0,
      endSeconds: 8.6,
      durationSeconds: null,
      autoAdvance: false,
      loopVideo: false,
    });
    expect(plait.steps[1]).toMatchObject({
      startSeconds: 8.8,
      endSeconds: 26.5,
      autoAdvance: true,
      loopVideo: true,
    });
    expect(plait.steps[2]).toMatchObject({
      startSeconds: 26.5,
      endSeconds: 37,
      autoAdvance: false,
      loopVideo: false,
    });
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
