import { describe, expect, it } from 'vitest';
import { clampEndSecondsToVideo, videoEndAdjustedMessage } from './editor-clip-end';

describe('clampEndSecondsToVideo', () => {
  it('leaves an in-range end unchanged', () => {
    expect(clampEndSecondsToVideo(90, 103.113)).toEqual({
      endSeconds: 90,
      clamped: false,
    });
    expect(clampEndSecondsToVideo(103.113, 103.113)).toEqual({
      endSeconds: 103.113,
      clamped: false,
    });
  });

  it('clamps an end past the video duration', () => {
    expect(clampEndSecondsToVideo(200, 103.113)).toEqual({
      endSeconds: 103.113,
      clamped: true,
    });
  });

  it('does not clamp when duration is unknown', () => {
    expect(clampEndSecondsToVideo(200, null)).toEqual({
      endSeconds: 200,
      clamped: false,
    });
    expect(clampEndSecondsToVideo(200, 0)).toEqual({
      endSeconds: 200,
      clamped: false,
    });
  });
});

describe('videoEndAdjustedMessage', () => {
  it('names the precise video end', () => {
    expect(videoEndAdjustedMessage(103.113)).toBe(
      'The video ends at 1:43.113 so the end time has been automatically adjusted.',
    );
  });
});
