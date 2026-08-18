import { describe, expect, it } from 'vitest';
import {
  activityCount,
  activityEntries,
  activityIndexAtOrAfter,
  activityIndexToEntryIndex,
  activityNumberAt,
  firstActivityIndex,
  isGapEntry,
  normaliseGapMessage,
  normaliseGapSeconds,
  previousActivityIndex,
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
});
