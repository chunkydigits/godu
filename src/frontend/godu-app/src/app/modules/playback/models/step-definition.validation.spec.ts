import { describe, expect, it } from 'vitest';
import { StepDefinition } from './step-definition.model';
import {
  validateStepDefinition,
  validateStepsItemSteps,
} from './step-definition.validation';

function step(partial: Partial<StepDefinition> & Pick<StepDefinition, 'id' | 'title'>): StepDefinition {
  return {
    order: 1,
    startSeconds: 0,
    endSeconds: 5,
    durationSeconds: null,
    autoAdvance: false,
    ...partial,
  };
}

describe('validateStepDefinition', () => {
  it('accepts a valid step', () => {
    const result = validateStepDefinition(
      step({ id: 'a', title: 'Warm-up', order: 1, startSeconds: 1, endSeconds: 8 }),
      60,
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects blank title', () => {
    const result = validateStepDefinition(step({ id: 'a', title: '   ' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title must not be blank');
  });

  it('rejects end <= start', () => {
    const result = validateStepDefinition(
      step({ id: 'a', title: 'X', startSeconds: 5, endSeconds: 5 }),
    );
    expect(result.valid).toBe(false);
  });

  it('rejects durationSeconds <= 0', () => {
    const result = validateStepDefinition(
      step({ id: 'a', title: 'X', durationSeconds: 0 }),
    );
    expect(result.valid).toBe(false);
  });

  it('rejects end beyond known video duration', () => {
    const result = validateStepDefinition(
      step({ id: 'a', title: 'X', startSeconds: 0, endSeconds: 90 }),
      60,
    );
    expect(result.valid).toBe(false);
  });

  it('accepts a gap with a length and no title or clip times', () => {
    const result = validateStepDefinition(
      step({ id: 'g', title: '', kind: 'gap', endSeconds: 0, durationSeconds: 20 }),
      60,
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects a gap without a usable length', () => {
    expect(
      validateStepDefinition(step({ id: 'g', title: '', kind: 'gap', durationSeconds: null }))
        .valid,
    ).toBe(false);
    expect(
      validateStepDefinition(step({ id: 'g', title: '', kind: 'gap', durationSeconds: 601 }))
        .valid,
    ).toBe(false);
  });

  it('rejects a gap message longer than 256 characters', () => {
    const result = validateStepDefinition(
      step({
        id: 'g',
        title: '',
        kind: 'gap',
        durationSeconds: 20,
        message: 'x'.repeat(257),
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Message must be 256 characters or fewer');
  });
});

describe('validateStepsItemSteps', () => {
  it('aggregates per-step errors', () => {
    const result = validateStepsItemSteps([
      step({ id: 'a', title: 'Good', order: 1, startSeconds: 0, endSeconds: 4 }),
      step({ id: 'b', title: '', order: 2, startSeconds: 4, endSeconds: 8 }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Step 2'))).toBe(true);
  });

  it('labels gap errors as gaps', () => {
    const result = validateStepsItemSteps([
      step({ id: 'a', title: 'Good', order: 1, startSeconds: 0, endSeconds: 4 }),
      step({ id: 'g', title: '', kind: 'gap', order: 2, durationSeconds: 0 }),
    ]);
    expect(result.errors.some((e) => e.startsWith('Gap 2'))).toBe(true);
  });

  it('requires at least one activity step', () => {
    const result = validateStepsItemSteps([
      step({ id: 'g', title: '', kind: 'gap', order: 1, durationSeconds: 20 }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one step is required');
  });
});
