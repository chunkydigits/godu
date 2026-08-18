export interface CreatorSocial {
  provider: string;
  username: string;
  profileUrl: string;
  displayName?: string | null;
}

export interface TikTokCreatorLink {
  /** Handle without the leading @. */
  handle: string;
  url: string;
}

export interface CreatorLinkSource {
  creatorDisplayName?: string | null;
  creatorSocials?: CreatorSocial[] | null;
  video: { creatorUsername?: string | null; sourceUrl?: string | null };
}

/** TikTok handles allow letters, digits, underscore and period. */
const TIKTOK_HANDLE = /^[a-z0-9._]{2,24}$/;

/** `buildTikTokSourceUrl` uses this when the creator handle is unknown. */
const PLACEHOLDER_HANDLE = 'video';

export function platformProfileUrl(
  provider: string,
  username: string | null | undefined,
): string | null {
  const handle = username?.trim().replace(/^@/, '').toLowerCase();
  if (!handle) {
    return null;
  }
  switch (provider.trim().toLowerCase()) {
    case 'tiktok':
      return `https://www.tiktok.com/@${handle}`;
    case 'instagram':
      return `https://www.instagram.com/${handle}/`;
    case 'youtube':
      return `https://www.youtube.com/@${handle}`;
    default:
      return null;
  }
}

function toHandle(value: string | null | undefined): string | null {
  const handle = value?.trim().replace(/^@/, '').toLowerCase();
  if (!handle || handle === PLACEHOLDER_HANDLE || !TIKTOK_HANDLE.test(handle)) {
    return null;
  }
  return handle;
}

function handleFromUrl(url: string | null | undefined): string | null {
  const match = url?.match(/\/@([^/?#]+)/);
  if (!match?.[1]) {
    return null;
  }
  try {
    return toHandle(decodeURIComponent(match[1]));
  } catch {
    return toHandle(match[1]);
  }
}

/**
 * Best-effort TikTok homepage for the creator a Steps item is based on. Falls
 * back through linked socials, the stored username, the video source URL and
 * finally a display name that is already a handle.
 */
export function tiktokCreatorLink(item: CreatorLinkSource): TikTokCreatorLink | null {
  const tiktok = item.creatorSocials?.find(
    (social) => social.provider.trim().toLowerCase() === 'tiktok',
  );
  const handle =
    toHandle(tiktok?.username) ??
    handleFromUrl(tiktok?.profileUrl) ??
    toHandle(item.video.creatorUsername) ??
    handleFromUrl(item.video.sourceUrl) ??
    toHandle(item.creatorDisplayName);
  if (!handle) {
    return null;
  }
  return { handle, url: `https://www.tiktok.com/@${handle}` };
}

export function tiktokHomepageUrl(item: CreatorLinkSource): string | null {
  return tiktokCreatorLink(item)?.url ?? null;
}

/** Label to show for the creator, preferring their display name. */
export function creatorLabel(item: CreatorLinkSource): string {
  const displayName = item.creatorDisplayName?.trim();
  if (displayName) {
    return displayName;
  }
  const handle = tiktokCreatorLink(item)?.handle;
  return handle ? `@${handle}` : '';
}

export function platformLabel(provider: string): string {
  switch (provider.trim().toLowerCase()) {
    case 'tiktok':
      return 'TikTok';
    case 'instagram':
      return 'Instagram';
    case 'youtube':
      return 'YouTube';
    default:
      return provider;
  }
}
