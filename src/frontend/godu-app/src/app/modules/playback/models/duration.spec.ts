import { describe, expect, it } from 'vitest';
import {
  combineMinutesSeconds,
  countdownUsesMinutes,
  formatCountdown,
  parseSeconds,
  splitSeconds,
} from './duration';

describe('duration helpers', () => {
  it('parses whole seconds and rejects blanks', () => {
    expect(parseSeconds(45)).toBe(45);
    expect(parseSeconds('90.7')).toBe(90);
    expect(parseSeconds('')).toBeNull();
    expect(parseSeconds(null)).toBeNull();
    expect(parseSeconds(-1)).toBeNull();
  });

  it('splits and combines minutes and seconds', () => {
    expect(splitSeconds(90)).toEqual({ minutes: 1, seconds: 30 });
    expect(splitSeconds(45)).toEqual({ minutes: 0, seconds: 45 });
    expect(splitSeconds(null)).toEqual({ minutes: 0, seconds: 0 });
    expect(combineMinutesSeconds(1, 30)).toBe(90);
    expect(combineMinutesSeconds(0, 45)).toBe(45);
    expect(combineMinutesSeconds(null, null)).toBe(0);
  });

  it('formats a countdown in seconds until it passes a minute', () => {
    expect(formatCountdown(null)).toBe('');
    expect(formatCountdown(0)).toBe('0');
    expect(formatCountdown(45)).toBe('45');
    expect(formatCountdown(60)).toBe('60');
    expect(formatCountdown(61)).toBe('1:01');
    expect(formatCountdown(90)).toBe('1:30');
    expect(formatCountdown(600)).toBe('10:00');
    expect(countdownUsesMinutes(60)).toBe(false);
    expect(countdownUsesMinutes(61)).toBe(true);
  });
});
