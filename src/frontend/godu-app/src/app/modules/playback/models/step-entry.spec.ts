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
  normaliseGapMessage,
  normaliseGapSeconds,
  previousActivityIndex,
  resolveStartGapMessage,
  resolveStartGapSeconds,
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
});
