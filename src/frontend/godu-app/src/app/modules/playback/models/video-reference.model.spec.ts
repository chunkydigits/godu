import { describe, expect, it } from 'vitest';
import { usesVideoContent } from './video-reference.model';
import { VideoProvider } from './video-provider.enum';

describe('usesVideoContent', () => {
  it('is false when the creator turned video off', () => {
    expect(
      usesVideoContent({
        useVideoContent: false,
        video: {
          provider: VideoProvider.TikTok,
          externalVideoId: '123',
        },
      }),
    ).toBe(false);
  });

  it('is false for a none placeholder video', () => {
    expect(
      usesVideoContent({
        video: { provider: VideoProvider.None, externalVideoId: '' },
      }),
    ).toBe(false);
  });
});
