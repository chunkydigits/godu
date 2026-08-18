import { StepDefinition } from './step-definition.model';
import {
  GAP_MESSAGE_MAX_LENGTH,
  GAP_SECONDS_MAX,
  GAP_SECONDS_MIN,
  activityCount,
  isGapEntry,
  stepEntryKind,
} from './step-entry';

export interface StepValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateStepDefinition(
  step: StepDefinition,
  videoDurationSeconds?: number | null,
): StepValidationResult {
  const errors: string[] = [];

  if (step.order < 1) {
    errors.push('Order must be >= 1');
  }

  if (isGapEntry(step)) {
    const seconds = step.durationSeconds;
    if (
      seconds == null ||
      !Number.isFinite(seconds) ||
      seconds < GAP_SECONDS_MIN ||
      seconds > GAP_SECONDS_MAX
    ) {
      errors.push(
        `DurationSeconds must be between ${GAP_SECONDS_MIN} and ${GAP_SECONDS_MAX}`,
      );
    }

    if ((step.message?.trim().length ?? 0) > GAP_MESSAGE_MAX_LENGTH) {
      errors.push(`Message must be ${GAP_MESSAGE_MAX_LENGTH} characters or fewer`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  if (!step.title?.trim()) {
    errors.push('Title must not be blank');
  }

  if (step.startSeconds < 0) {
    errors.push('StartSeconds must be >= 0');
  }

  if (step.endSeconds <= step.startSeconds) {
    errors.push('EndSeconds must be greater than StartSeconds');
  }

  if (step.durationSeconds != null && step.durationSeconds <= 0) {
    errors.push('DurationSeconds must be null or > 0');
  }

  if (
    videoDurationSeconds != null &&
    videoDurationSeconds > 0 &&
    step.endSeconds > videoDurationSeconds
  ) {
    errors.push('EndSeconds must be <= video duration when duration is known');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateStepsItemSteps(
  steps: StepDefinition[],
  videoDurationSeconds?: number | null,
): StepValidationResult {
  const errors: string[] = [];

  for (const step of steps) {
    const result = validateStepDefinition(step, videoDurationSeconds);
    if (!result.valid) {
      const label = stepEntryKind(step) === 'gap' ? 'Gap' : 'Step';
      errors.push(...result.errors.map((e) => `${label} ${step.order}: ${e}`));
    }
  }

  if (steps.length > 0 && activityCount(steps) === 0) {
    errors.push('At least one step is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
