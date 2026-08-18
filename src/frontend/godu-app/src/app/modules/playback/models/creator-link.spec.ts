import { describe, expect, it } from 'vitest';
import { creatorLabel, tiktokCreatorLink, tiktokHomepageUrl } from './creator-link';

const sourceUrl = 'https://www.tiktok.com/@lagomchef/video/1234567890123456789';

describe('creator links', () => {
  it('opens the TikTok homepage from the stored username', () => {
    expect(
      tiktokHomepageUrl({
        creatorDisplayName: 'Coach Amy',
        video: { creatorUsername: 'coach', sourceUrl },
      }),
    ).toBe('https://www.tiktok.com/@coach');
  });

  it('falls back to the handle in the video source URL', () => {
    expect(
      tiktokCreatorLink({
        creatorDisplayName: 'Lagom Chef',
        video: { sourceUrl },
      }),
    ).toEqual({ handle: 'lagomchef', url: 'https://www.tiktok.com/@lagomchef' });
  });

  it('prefers a linked TikTok social account', () => {
    expect(
      tiktokHomepageUrl({
        creatorSocials: [
          {
            provider: 'instagram',
            username: 'other',
            profileUrl: 'https://www.instagram.com/other/',
          },
          {
            provider: 'tiktok',
            username: 'coach',
            profileUrl: 'https://www.tiktok.com/@coach',
          },
        ],
        video: { creatorUsername: 'stale', sourceUrl },
      }),
    ).toBe('https://www.tiktok.com/@coach');
  });

  it('uses a display name only when it looks like a handle', () => {
    expect(
      tiktokHomepageUrl({
        creatorDisplayName: '@lagomchef',
        video: {},
      }),
    ).toBe('https://www.tiktok.com/@lagomchef');
    expect(
      tiktokHomepageUrl({
        creatorDisplayName: 'Lagom Chef',
        video: {},
      }),
    ).toBeNull();
  });

  it('ignores the placeholder handle used when the creator is unknown', () => {
    expect(
      tiktokCreatorLink({
        video: { sourceUrl: 'https://www.tiktok.com/@video/video/1234567890123456789' },
      }),
    ).toBeNull();
  });

  it('labels the creator with their handle when no display name is stored', () => {
    expect(creatorLabel({ video: { sourceUrl } })).toBe('@lagomchef');
    expect(creatorLabel({ creatorDisplayName: 'Lagom Chef', video: { sourceUrl } })).toBe(
      'Lagom Chef',
    );
  });
});
