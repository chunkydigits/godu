import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TIMING_BEEP_SECONDS,
  normalizeTimingBeepSeconds,
  resolveTimingBeepSeconds,
  timingBeepMarksDue,
} from './timing-beep';

describe('timing beep interval', () => {
  it('accepts whole seconds in range', () => {
    expect(normalizeTimingBeepSeconds(20)).toBe(20);
    expect(normalizeTimingBeepSeconds(30.9)).toBe(30);
    expect(normalizeTimingBeepSeconds(5)).toBe(5);
    expect(normalizeTimingBeepSeconds(600)).toBe(600);
  });

  it('rejects empty or out of range values', () => {
    expect(normalizeTimingBeepSeconds(null)).toBeNull();
    expect(normalizeTimingBeepSeconds(undefined)).toBeNull();
    expect(normalizeTimingBeepSeconds(0)).toBeNull();
    expect(normalizeTimingBeepSeconds(4)).toBeNull();
    expect(normalizeTimingBeepSeconds(601)).toBeNull();
  });

  it('lets the viewer interval win over the Godu interval', () => {
    expect(
      resolveTimingBeepSeconds({
        goduSeconds: 30,
        userEnabled: true,
        userSeconds: 20,
      }),
    ).toBe(20);
  });

  it('uses the Godu interval when the viewer has not chosen one', () => {
    expect(
      resolveTimingBeepSeconds({
        goduSeconds: 20,
        userEnabled: true,
        userSeconds: null,
      }),
    ).toBe(20);
  });

  it('falls back to 30 seconds when neither side set an interval', () => {
    expect(
      resolveTimingBeepSeconds({
        goduSeconds: null,
        userEnabled: true,
        userSeconds: null,
      }),
    ).toBe(DEFAULT_TIMING_BEEP_SECONDS);
  });

  it('is silent when the viewer turned ticks off', () => {
    expect(
      resolveTimingBeepSeconds({
        goduSeconds: 30,
        userEnabled: false,
        userSeconds: 20,
      }),
    ).toBeNull();
  });
});

describe('timingBeepMarksDue', () => {
  it('beeps at 30 seconds into a 60 second timer', () => {
    expect(timingBeepMarksDue(60, 30, 30, 0)).toEqual([30]);
  });

  it('beeps at 20 and 40 seconds into a 60 second timer', () => {
    expect(timingBeepMarksDue(60, 40, 20, 0)).toEqual([20]);
    expect(timingBeepMarksDue(60, 20, 20, 20)).toEqual([40]);
  });

  it('does not beep at the start or the end', () => {
    expect(timingBeepMarksDue(60, 60, 30, 0)).toEqual([]);
    expect(timingBeepMarksDue(60, 0, 30, 30)).toEqual([]);
  });

  it('does not repeat a mark that already beeped', () => {
    expect(timingBeepMarksDue(60, 30, 30, 30)).toEqual([]);
  });

  it('catches up a skipped mark after a pause jump', () => {
    expect(timingBeepMarksDue(60, 28, 30, 0)).toEqual([30]);
  });

  it('skips a 30 second interval on a 20 second timer', () => {
    expect(timingBeepMarksDue(20, 10, 30, 0)).toEqual([]);
  });
});
