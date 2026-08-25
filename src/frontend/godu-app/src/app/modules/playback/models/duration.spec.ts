import { describe, expect, it } from 'vitest';
import {
  combineMinutesSeconds,
  countdownProgress,
  countdownUsesMinutes,
  formatCompactDuration,
  formatCountdown,
  formatSpokenDuration,
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

  it('formats a compact title duration in m and s from a minute', () => {
    expect(formatCompactDuration(null)).toBe('—');
    expect(formatCompactDuration(-1)).toBe('—');
    expect(formatCompactDuration(0)).toBe('0s');
    expect(formatCompactDuration(45)).toBe('45s');
    expect(formatCompactDuration(59)).toBe('59s');
    expect(formatCompactDuration(60)).toBe('1m');
    expect(formatCompactDuration(90)).toBe('1m 30s');
    expect(formatCompactDuration(900)).toBe('15m');
  });

  it('speaks a duration in minutes and seconds from a minute', () => {
    expect(formatSpokenDuration(null)).toBe('');
    expect(formatSpokenDuration(0)).toBe('');
    expect(formatSpokenDuration(1)).toBe('1 second');
    expect(formatSpokenDuration(45)).toBe('45 seconds');
    expect(formatSpokenDuration(60)).toBe('1 minute');
    expect(formatSpokenDuration(61)).toBe('1 minute and 1 second');
    expect(formatSpokenDuration(90)).toBe('1 minute and 30 seconds');
    expect(formatSpokenDuration(120)).toBe('2 minutes');
    expect(formatSpokenDuration(900)).toBe('15 minutes');
  });

  it('fills countdown progress as remaining time runs out', () => {
    expect(countdownProgress(null, 15)).toBe(0);
    expect(countdownProgress(15, 15)).toBe(0);
    expect(countdownProgress(7.5, 15)).toBe(50);
    expect(countdownProgress(0, 15)).toBe(100);
    expect(countdownProgress(0, 0)).toBe(0);
  });
});
