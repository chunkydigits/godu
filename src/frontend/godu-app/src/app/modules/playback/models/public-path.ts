/** SPA path segment for a video provider, matching the API public URLs. */
export function publicAlias(provider: string | null | undefined): string {
  switch ((provider ?? '').trim().toLowerCase()) {
    case 'tiktok':
    case 't':
      return 't';
    case 'youtube':
    case 'y':
      return 'y';
    case 'instagram':
    case 'i':
      return 'i';
    case 'vimeo':
    case 'v':
      return 'v';
    default:
      return (provider ?? '').trim().toLowerCase();
  }
}

export function publicCreatorPath(
  provider: string | null | undefined,
  username: string | null | undefined,
): string | null {
  const alias = publicAlias(provider);
  const handle = username?.trim().replace(/^@/, '').toLowerCase();
  if (!alias || !handle) {
    return null;
  }
  return `/${alias}/${handle}`;
}

export function viewerBackPath(options: {
  provider?: string | null;
  username?: string | null;
  playId?: string | null;
  isDemo?: boolean;
}): string {
  const creator = publicCreatorPath(options.provider, options.username);
  if (creator) {
    return creator;
  }

  if (options.playId && !options.isDemo) {
    return '/my-steps';
  }

  return '/demos';
}

const PUBLIC_VIEWER = /^\/(t|tiktok|y|youtube|i|instagram|v|vimeo)\/([^/]+)(?:\/|$)/;
const PLAY_VIEWER = /^\/play\/([^/]+)/;

export function viewerBackPathFromUrl(
  url: string,
  isDemoId: (id: string) => boolean = () => false,
): string {
  const path = url.split('?')[0] || '/';
  const publicMatch = PUBLIC_VIEWER.exec(path);
  if (publicMatch) {
    return publicCreatorPath(publicMatch[1], publicMatch[2]) ?? '/demos';
  }

  const playMatch = PLAY_VIEWER.exec(path);
  if (playMatch) {
    return viewerBackPath({
      playId: decodeURIComponent(playMatch[1]),
      isDemo: isDemoId(playMatch[1]),
    });
  }

  return '/demos';
}

export interface PublicPathSource {
  publicPath?: string | null;
  slug?: string | null;
  provider?: string | null;
  username?: string | null;
  video?: {
    provider?: string | null;
    creatorUsername?: string | null;
  } | null;
}

export function normalizePublicPath(path: string | null | undefined): string | null {
  const trimmed = path?.trim();
  if (!trimmed) {
    return null;
  }

  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withoutQuery = withSlash.split('?')[0] ?? withSlash;
  const stripped = withoutQuery.replace(/\/+$/, '');
  return (stripped || '/').toLowerCase();
}

export function shouldReplaceCanonicalPath(
  currentUrl: string,
  canonicalPath: string | null | undefined,
): boolean {
  const current = normalizePublicPath(currentUrl);
  const canonical = normalizePublicPath(canonicalPath);
  return !!canonical && current !== canonical;
}

export function publicViewerPath(source: PublicPathSource): string | null {
  const stored = source.publicPath?.trim();
  if (stored) {
    return stored.startsWith('/') ? stored : `/${stored}`;
  }

  const provider = source.provider ?? source.video?.provider;
  const username = source.username ?? source.video?.creatorUsername;
  const slug = canonicalSlug(source.slug);
  const creator = publicCreatorPath(provider, username);
  if (!creator || !slug) {
    return null;
  }
  return `${creator}/${slug}`;
}

export function canonicalSlug(slug: string | null | undefined): string {
  return slug?.trim().toLowerCase() ?? '';
}

const VALID_SLUG = /^[a-z0-9._-]+$/;

export function isValidSlug(slug: string): boolean {
  return VALID_SLUG.test(slug);
}

/** Same rules as the API `SlugUtilities.FromTitle`. */
export function slugFromTitle(title: string | null | undefined): string {
  if (!title?.trim()) {
    return '';
  }

  const buffer: string[] = [];
  let dash = false;
  for (const ch of title.trim().toLowerCase()) {
    if (isAsciiLetterOrDigit(ch) || ch === '.' || ch === '_') {
      buffer.push(ch);
      dash = false;
      continue;
    }

    if ((ch === ' ' || ch === '-') && buffer.length > 0 && !dash) {
      buffer.push('-');
      dash = true;
    }
  }

  while (buffer.length > 0 && buffer[buffer.length - 1] === '-') {
    buffer.pop();
  }

  return buffer.join('').slice(0, 80);
}

function isAsciiLetterOrDigit(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return (
    (code >= 48 && code <= 57) ||
    (code >= 97 && code <= 122) ||
    (code >= 65 && code <= 90)
  );
}
