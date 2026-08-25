import { StepDefinition } from './step-definition.model';
import {
  GAP_MESSAGE_MAX_LENGTH,
  GAP_SECONDS_MAX,
  GAP_SECONDS_MIN,
  activityCount,
  isCardEntry,
  isGapEntry,
  isHexColour,
  stepEntryKind,
} from './step-entry';

export interface StepValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateStepDefinition(
  step: StepDefinition,
  videoDurationSeconds?: number | null,
  useVideoContent = true,
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

  if (isCardEntry(step)) {
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

    if (step.backgroundColor && !isHexColour(step.backgroundColor)) {
      errors.push('BackgroundColor must be a hex colour such as #02C998');
    }

    if (step.textColor && !isHexColour(step.textColor)) {
      errors.push('TextColor must be a hex colour such as #002116');
    }

    if (step.stillSeconds != null) {
      if (!useVideoContent) {
        errors.push('A still needs a TikTok. Turn video content on, or use a colour card');
      } else if (step.stillSeconds < 0) {
        errors.push('StillSeconds must be >= 0');
      } else if (
        videoDurationSeconds != null &&
        videoDurationSeconds > 0 &&
        step.stillSeconds > videoDurationSeconds
      ) {
        errors.push('StillSeconds must be <= video duration');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  if (!useVideoContent) {
    errors.push('Video steps need a TikTok. Turn video content on, or use a card');
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
  useVideoContent = true,
): StepValidationResult {
  const errors: string[] = [];

  for (const step of steps) {
    const result = validateStepDefinition(step, videoDurationSeconds, useVideoContent);
    if (!result.valid) {
      const kind = stepEntryKind(step);
      const label = kind === 'gap' ? 'Gap' : kind === 'card' ? 'Card' : 'Step';
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
