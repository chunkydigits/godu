import { describe, expect, it } from 'vitest';
import {
  activityCount,
  activityEntries,
  activityIndexAtOrAfter,
  activityIndexToEntryIndex,
  activityNumberAt,
  firstActivityIndex,
  hasStartGapOverride,
  isGapEntry,
  canGoToNextStep,
  canGoToPreviousStep,
  formatElapsed,
  hasMoreIterations,
  hasPreviousIteration,
  hasTimedActivity,
  isOnFinalStep,
  iterationCaption,
  lastActivityIndex,
  sessionTimeSummary,
  normaliseGapMessage,
  normaliseGapSeconds,
  previousActivityIndex,
  resolveStartGapMessage,
  resolveStartGapSeconds,
  resolvedRepeatCount,
  shouldLoopVideo,
  stepEntryKind,
} from './step-entry';

/** step, gap, step, step */
const entries = [
  { kind: 'step' },
  { kind: 'gap' },
  { kind: 'step' },
  { kind: 'step' },
];

describe('step entries', () => {
  it('treats entries without a kind as activity steps', () => {
    expect(stepEntryKind({})).toBe('step');
    expect(stepEntryKind(undefined)).toBe('step');
    expect(isGapEntry({ kind: 'gap' })).toBe(true);
    expect(isGapEntry({ kind: 'GAP' })).toBe(false);
  });

  it('counts and filters activity steps, ignoring gaps', () => {
    expect(activityCount(entries)).toBe(3);
    expect(activityEntries(entries)).toHaveLength(3);
  });

  it('numbers steps without counting gaps', () => {
    expect(activityNumberAt(entries, 0)).toBe(1);
    expect(activityNumberAt(entries, 2)).toBe(2);
    expect(activityNumberAt(entries, 3)).toBe(3);
    expect(activityNumberAt(entries, 9)).toBeNull();
  });

  it('maps navigator positions back to entry indexes', () => {
    expect(activityIndexToEntryIndex(entries, 0)).toBe(0);
    expect(activityIndexToEntryIndex(entries, 1)).toBe(2);
    expect(activityIndexToEntryIndex(entries, 2)).toBe(3);
    expect(activityIndexToEntryIndex(entries, 3)).toBeNull();
  });

  it('finds neighbouring steps around gaps', () => {
    expect(firstActivityIndex([{ kind: 'gap' }, { kind: 'step' }])).toBe(1);
    expect(lastActivityIndex(entries)).toBe(3);
    expect(lastActivityIndex([{ kind: 'gap' }])).toBeNull();
    expect(activityIndexAtOrAfter(entries, 1)).toBe(2);
    expect(previousActivityIndex(entries, 2)).toBe(0);
    expect(previousActivityIndex(entries, 0)).toBeNull();
    expect(activityIndexAtOrAfter([{ kind: 'gap' }], 0)).toBeNull();
  });

  it('clamps gap lengths and trims messages', () => {
    expect(normaliseGapSeconds(30)).toBe(30);
    expect(normaliseGapSeconds(30.7)).toBe(30);
    expect(normaliseGapSeconds(0)).toBe(0);
    expect(normaliseGapSeconds(null)).toBe(0);
    expect(normaliseGapSeconds(9000)).toBe(600);
    expect(normaliseGapMessage('  Breathe  ')).toBe('Breathe');
    expect(normaliseGapMessage('   ')).toBeNull();
    expect(normaliseGapMessage('x'.repeat(300))).toHaveLength(256);
  });

  it('uses the between-step gap for the intro unless an override is set', () => {
    expect(resolveStartGapSeconds({ playGapPriorToStart: false, gapSeconds: 10 })).toBe(0);
    expect(resolveStartGapSeconds({ playGapPriorToStart: true, gapSeconds: 10 })).toBe(10);
    expect(
      resolveStartGapSeconds({
        playGapPriorToStart: true,
        gapSeconds: 10,
        startGapSeconds: 4,
      }),
    ).toBe(4);
    expect(resolveStartGapSeconds({ playGapPriorToStart: true })).toBe(0);
  });

  it('uses the start-gap message for the intro unless it is blank', () => {
    expect(
      resolveStartGapMessage({
        playGapPriorToStart: true,
        gapMessage: 'Rest',
        startGapMessage: 'Watch the demo',
      }),
    ).toBe('Watch the demo');
    expect(
      resolveStartGapMessage({
        playGapPriorToStart: true,
        gapMessage: 'Rest',
      }),
    ).toBe('Rest');
    expect(resolveStartGapMessage({ playGapPriorToStart: false, gapMessage: 'Rest' })).toBeNull();
    expect(hasStartGapOverride({ startGapSeconds: 4 })).toBe(true);
    expect(hasStartGapOverride({ startGapMessage: 'Watch' })).toBe(true);
    expect(hasStartGapOverride({})).toBe(false);
  });

  it('loops when loopVideo is on, including timed steps', () => {
    expect(shouldLoopVideo({ durationSeconds: 10 })).toBe(true);
    expect(shouldLoopVideo({ durationSeconds: 10, loopVideo: false })).toBe(false);
    expect(shouldLoopVideo({ durationSeconds: null })).toBe(true);
    expect(shouldLoopVideo({ durationSeconds: null, loopVideo: false })).toBe(false);
    expect(shouldLoopVideo({ durationSeconds: null, loopVideo: false }, true)).toBe(true);
  });

  it('treats repeat counts below 2 as a single pass', () => {
    expect(resolvedRepeatCount()).toBe(1);
    expect(resolvedRepeatCount({ repeatCount: null })).toBe(1);
    expect(resolvedRepeatCount({ repeatCount: 1 })).toBe(1);
    expect(resolvedRepeatCount({ repeatCount: 5 })).toBe(5);
    expect(resolvedRepeatCount({ repeatCount: 200 })).toBe(99);
  });

  it('names the current iteration only when the Godu repeats', () => {
    expect(iterationCaption(1, 1)).toBeNull();
    expect(iterationCaption(1, 3)).toBe('Iteration 1 of 3');
    expect(iterationCaption(2, 3)).toBe('Iteration 2 of 3');
    expect(iterationCaption(2, 3, false)).toBeNull();
    expect(hasMoreIterations(1, 3)).toBe(true);
    expect(hasMoreIterations(3, 3)).toBe(false);
    expect(hasPreviousIteration(1, 3)).toBe(false);
    expect(hasPreviousIteration(2, 3)).toBe(true);
  });

  it('lets next wrap after the last step when iterations remain', () => {
    expect(
      canGoToNextStep({ stepNumber: 3, stepCount: 3, iteration: 1, iterationCount: 2 }),
    ).toBe(true);
    expect(
      canGoToNextStep({ stepNumber: 3, stepCount: 3, iteration: 2, iterationCount: 2 }),
    ).toBe(false);
    expect(
      canGoToPreviousStep({ stepNumber: 1, stepCount: 3, iteration: 2, iterationCount: 2 }),
    ).toBe(true);
    expect(
      canGoToPreviousStep({ stepNumber: 1, stepCount: 3, iteration: 1, iterationCount: 2 }),
    ).toBe(false);
  });

  it('treats the last step of the last iteration as the final step', () => {
    expect(
      isOnFinalStep({ stepNumber: 3, stepCount: 3, iteration: 1, iterationCount: 1 }),
    ).toBe(true);
    expect(
      isOnFinalStep({ stepNumber: 3, stepCount: 3, iteration: 1, iterationCount: 2 }),
    ).toBe(false);
    expect(
      isOnFinalStep({ stepNumber: 3, stepCount: 3, iteration: 2, iterationCount: 2 }),
    ).toBe(true);
    expect(
      isOnFinalStep({ stepNumber: 2, stepCount: 3, iteration: 2, iterationCount: 2 }),
    ).toBe(false);
  });

  it('summarises elapsed time only for timed Godus', () => {
    expect(formatElapsed(0)).toBe('0 seconds');
    expect(formatElapsed(1)).toBe('1 second');
    expect(formatElapsed(45)).toBe('45 seconds');
    expect(formatElapsed(60)).toBe('1 minute');
    expect(formatElapsed(94)).toBe('1 minute 34 seconds');
    expect(formatElapsed(3725)).toBe('1 hour 2 minutes 5 seconds');
    expect(hasTimedActivity([{ durationSeconds: null }, { durationSeconds: 30 }])).toBe(true);
    expect(hasTimedActivity([{ durationSeconds: null }, { kind: 'gap', durationSeconds: 20 }])).toBe(
      false,
    );
    expect(sessionTimeSummary(94, true)).toBe('It took 1 minute 34 seconds.');
    expect(sessionTimeSummary(94, false)).toBeNull();
    expect(sessionTimeSummary(null, true)).toBeNull();
  });
});
