import { LinkedPlatformAccount } from '../../settings/models/linked-platform-account.model';
import { importedTikTokHandle, parseTikTokVideo } from './tiktok-video-id';

export interface VideoCreatorIdentity {
  creatorExternalAccountId?: string | null;
  creatorUsername?: string | null;
  sourceUrl?: string | null;
}

function normaliseHandle(value: string | null | undefined): string | null {
  return importedTikTokHandle(value)?.toLowerCase() ?? null;
}

function videoCreatorHandle(video: VideoCreatorIdentity): string | null {
  return (
    normaliseHandle(video.creatorUsername) ??
    normaliseHandle(parseTikTokVideo(video.sourceUrl ?? '')?.username)
  );
}

function accountHandles(account: LinkedPlatformAccount): string[] {
  return [account.username, ...(account.usernameAliases ?? [])]
    .map((name) => normaliseHandle(name))
    .filter((name): name is string => !!name);
}

/** True when a verified linked TikTok is the same account the video was taken from. */
export function linkedTikTokOwnsVideo(
  video: VideoCreatorIdentity,
  accounts: readonly LinkedPlatformAccount[],
): boolean {
  const verified = accounts.filter(
    (account) => account.provider.toLowerCase() === 'tiktok' && account.isVerified,
  );
  if (verified.length === 0) {
    return false;
  }

  const openId = video.creatorExternalAccountId?.trim();
  if (openId) {
    return verified.some((account) => account.externalAccountId === openId);
  }

  const handle = videoCreatorHandle(video);
  if (!handle) {
    return false;
  }

  return verified.some((account) => accountHandles(account).includes(handle));
}
