import { StepsItem } from './steps-item.model';
import { isGapEntry, normaliseGapMessage, normaliseGapSeconds } from './step-entry';

export interface StepTransition {
  /** Index of the next activity step, or null when the sequence is finished. */
  nextIndex: number | null;
  gapSeconds: number;
  gapMessage: string | null;
}

/**
 * Works out what follows the entry at `fromIndex`: the next activity step, and
 * the rest to run before it. Gap entries between the two supply that rest;
 * without one, the item-level gap applies as the default between steps.
 * Consecutive gaps are added together, and a gap at the end of the list is
 * dropped rather than delaying completion.
 */
export function resolveStepTransition(
  item: StepsItem | null | undefined,
  fromIndex: number,
): StepTransition {
  const steps = item?.steps ?? [];
  const none: StepTransition = { nextIndex: null, gapSeconds: 0, gapMessage: null };
  if (steps.length === 0) {
    return none;
  }

  let index = Math.max(-1, fromIndex) + 1;
  let gapSeconds = 0;
  let gapMessage: string | null = null;

  while (index < steps.length && isGapEntry(steps[index])) {
    const gap = steps[index];
    gapSeconds += normaliseGapSeconds(gap.durationSeconds);
    gapMessage ??= normaliseGapMessage(gap.message);
    index += 1;
  }

  if (index >= steps.length) {
    return none;
  }

  if (gapSeconds > 0) {
    return { nextIndex: index, gapSeconds, gapMessage };
  }

  const defaultGap = normaliseGapSeconds(item?.gapSeconds);
  return {
    nextIndex: index,
    gapSeconds: defaultGap,
    gapMessage: defaultGap > 0 ? normaliseGapMessage(item?.gapMessage) : null,
  };
}
