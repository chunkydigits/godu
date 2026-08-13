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
});
