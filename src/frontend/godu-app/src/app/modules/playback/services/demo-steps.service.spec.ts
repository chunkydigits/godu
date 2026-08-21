import { describe, expect, it } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { DemoStepsService } from './demo-steps.service';

describe('DemoStepsService related', () => {
  const service = new DemoStepsService();

  it('lists only catalogue demos with a category', async () => {
    const listed = await firstValueFrom(service.list());
    expect(listed.length).toBeGreaterThan(0);
    expect(listed.every((item) => item.listed && item.category)).toBe(true);
    expect(listed.some((item) => item.id === 'steps_demo_fitness_core')).toBe(false);
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
