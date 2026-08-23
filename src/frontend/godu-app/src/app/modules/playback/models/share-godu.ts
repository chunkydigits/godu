import { publicViewerPath } from './public-path';

export type ShareMethod = 'native' | 'copy-link';

export interface ShareableGodu {
  id: string;
  title: string;
  publicPath?: string | null;
  slug?: string | null;
  video?: {
    provider?: string | null;
    creatorUsername?: string | null;
  } | null;
}

/** Path plus origin when a window exists; path only without a window. */
export function shareableGoduUrl(item: ShareableGodu): string {
  const path = publicViewerPath(item) ?? `/play/${item.id}`;
  if (typeof window === 'undefined') {
    return path;
  }
  return `${window.location.origin}${path}`;
}

export async function shareOrCopyUrl(
  url: string,
  title: string,
): Promise<ShareMethod | null> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url });
    } catch {
      // User cancelled or the share sheet failed.
    }
    return 'native';
  }

  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return null;
  }

  await navigator.clipboard.writeText(url);
  return 'copy-link';
}
