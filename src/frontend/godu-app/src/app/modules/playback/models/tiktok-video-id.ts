/**
 * Accepts a raw TikTok video ID or a TikTok URL containing `/video/{id}`.
 */
export function parseTikTokVideoId(input: string): string | null {
  return parseTikTokVideo(input)?.videoId ?? null;
}

export interface ParsedTikTokVideo {
  videoId: string;
  /** Platform username without @, when present in the URL. */
  username: string | null;
  sourceUrl: string;
}

/**
 * Parses a TikTok ID or URL into video id, optional @username, and canonical source URL.
 */
export function parseTikTokVideo(input: string): ParsedTikTokVideo | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  let videoId: string | null = null;
  let username: string | null = null;

  if (/^\d{5,}$/.test(trimmed)) {
    videoId = trimmed;
  } else {
    try {
      const url = new URL(trimmed);
      const videoMatch = url.pathname.match(/\/video\/(\d{5,})/);
      videoId = videoMatch?.[1] ?? null;
      const userMatch = url.pathname.match(/^\/@([^/]+)\/video\//);
      if (userMatch?.[1]) {
        username = decodeURIComponent(userMatch[1]);
      }
    } catch {
      const videoMatch = trimmed.match(/\/video\/(\d{5,})/);
      videoId = videoMatch?.[1] ?? null;
      const userMatch = trimmed.match(/\/@([^/?#]+)\/video\//);
      if (userMatch?.[1]) {
        username = decodeURIComponent(userMatch[1]);
      }
    }
  }

  if (!videoId) {
    return null;
  }

  return {
    videoId,
    username,
    sourceUrl: buildTikTokSourceUrl(videoId, username),
  };
}

export function buildTikTokSourceUrl(videoId: string, username?: string | null): string {
  const handle = (username ?? 'video').replace(/^@/, '').trim() || 'video';
  return `https://www.tiktok.com/@${handle}/video/${videoId}`;
}

const SHORT_LINK_HOSTS = new Set([
  'vm.tiktok.com',
  'vt.tiktok.com',
  'www.vm.tiktok.com',
  'www.vt.tiktok.com',
]);

const SHORT_CODE = /^[A-Za-z0-9]{5,32}$/;

function isTikTokWatchHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === 'tiktok.com' || h === 'www.tiktok.com' || h === 'm.tiktok.com';
}

/**
 * Mobile share links (vm.tiktok.com / vt.tiktok.com / tiktok.com/t/…) have no
 * video id in the path. Returns a canonical short URL to send to oEmbed, or null.
 */
export function canonicalTikTokShortUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split('/').filter(Boolean);

    if (SHORT_LINK_HOSTS.has(host) && segments.length === 1 && SHORT_CODE.test(segments[0])) {
      const canonHost = host.replace(/^www\./, '');
      return `https://${canonHost}/${segments[0]}/`;
    }

    if (
      isTikTokWatchHost(host) &&
      segments.length === 2 &&
      segments[0].toLowerCase() === 't' &&
      SHORT_CODE.test(segments[1])
    ) {
      return `https://www.tiktok.com/t/${segments[1]}/`;
    }
  } catch {
    return null;
  }

  return null;
}

/** Suggested Steps title when only the creator handle is known. */
export function suggestTitleFromTikTok(username: string | null): string | null {
  if (!username) {
    return null;
  }
  return `Steps from @${username.replace(/^@/, '')}`;
}

export function formatCreatorDisplayName(username: string | null): string | null {
  if (!username) {
    return null;
  }
  const handle = username.replace(/^@/, '').trim();
  return handle ? `@${handle}` : null;
}
