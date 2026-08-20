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
