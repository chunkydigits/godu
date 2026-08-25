import { describe, expect, it } from 'vitest';
import { LinkedPlatformAccount } from '../../settings/models/linked-platform-account.model';
import { linkedTikTokOwnsVideo } from './linked-tiktok-owns-video';

function account(
  overrides: Partial<LinkedPlatformAccount> = {},
): LinkedPlatformAccount {
  return {
    id: 'platform_1',
    userId: 'usr_1',
    provider: 'tiktok',
    externalAccountId: 'oid_coach',
    username: 'coach',
    isVerified: true,
    createdUtc: '2026-01-01T00:00:00Z',
    updatedUtc: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('linkedTikTokOwnsVideo', () => {
  it('allows publish when the video handle matches the linked TikTok', () => {
    expect(
      linkedTikTokOwnsVideo({ creatorUsername: 'Coach' }, [account()]),
    ).toBe(true);
  });

  it('allows publish when the handle only matches a previous alias', () => {
    expect(
      linkedTikTokOwnsVideo({ creatorUsername: 'oldcoach' }, [
        account({ usernameAliases: ['oldcoach'] }),
      ]),
    ).toBe(true);
  });

  it('allows publish when the stable TikTok id matches', () => {
    expect(
      linkedTikTokOwnsVideo(
        { creatorUsername: 'someone-else', creatorExternalAccountId: 'oid_coach' },
        [account()],
      ),
    ).toBe(true);
  });

  it('blocks publish when the video is from a different TikTok', () => {
    expect(
      linkedTikTokOwnsVideo({ creatorUsername: 'someone-else' }, [account()]),
    ).toBe(false);
  });

  it('blocks publish when the stable TikTok id differs', () => {
    expect(
      linkedTikTokOwnsVideo(
        { creatorUsername: 'coach', creatorExternalAccountId: 'oid_other' },
        [account()],
      ),
    ).toBe(false);
  });

  it('blocks publish when TikTok is not verified', () => {
    expect(
      linkedTikTokOwnsVideo({ creatorUsername: 'coach' }, [
        account({ isVerified: false }),
      ]),
    ).toBe(false);
  });

  it('reads the handle from the source URL when username is missing', () => {
    expect(
      linkedTikTokOwnsVideo(
        { sourceUrl: 'https://www.tiktok.com/@coach/video/1234567890123456789' },
        [account()],
      ),
    ).toBe(true);
  });
});
