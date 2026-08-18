import { describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import {
  estimateSpeechSeconds,
  formatNextUpAnnouncement,
  formatStepAnnouncement,
  formatTimerStartAnnouncement,
  gapGoCueMaxSeconds,
} from './playback-voice-cues';

describe('playback voice cue phrases', () => {
  it('reads the step title and duration', () => {
    expect(formatStepAnnouncement('Body Waves', 60)).toBe('Body Waves for 60 seconds');
    expect(formatStepAnnouncement('Hold', 1)).toBe('Hold for 1 second');
    expect(formatStepAnnouncement('Flow', null)).toBe('Flow');
  });

  it('announces the next step at the start of a gap', () => {
    expect(formatNextUpAnnouncement('Body Waves', 60)).toBe(
      'Next up Body Waves for 60 seconds',
    );
  });

  it('uses Go only when the gap is under the configured threshold', () => {
    const original = environment.playback.gapGoCueMaxSeconds;
    environment.playback.gapGoCueMaxSeconds = 10;
    try {
      expect(gapGoCueMaxSeconds()).toBe(10);
      expect(formatTimerStartAnnouncement('Body Waves', 60, 5)).toBe('Go');
      expect(formatTimerStartAnnouncement('Body Waves', 60, 10)).toBe(
        'Body Waves for 60 seconds, Go',
      );
      expect(formatTimerStartAnnouncement('Body Waves', 60, 20)).toBe(
        'Body Waves for 60 seconds, Go',
      );
      expect(formatTimerStartAnnouncement('Body Waves', 60, null)).toBe(
        'Body Waves for 60 seconds',
      );
    } finally {
      environment.playback.gapGoCueMaxSeconds = original;
    }
  });

  it('estimates enough lead time for a spoken Go phrase', () => {
    const seconds = estimateSpeechSeconds('Body Waves for 60 seconds, Go');
    expect(seconds).toBeGreaterThan(1);
    expect(seconds).toBeLessThan(8);
  });
});
