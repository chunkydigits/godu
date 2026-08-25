import { VideoProvider } from './video-provider.enum';

export interface VideoReference {
  provider: VideoProvider;
  externalVideoId: string;
  sourceUrl: string;
  creatorExternalAccountId?: string;
  creatorUsername?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
}

export function usesVideoContent(item: {
  useVideoContent?: boolean | null;
  video?: { provider?: string | null; externalVideoId?: string | null } | null;
}): boolean {
  if (item.useVideoContent === false) {
    return false;
  }
  const provider = item.video?.provider?.trim().toLowerCase();
  if (provider === VideoProvider.None) {
    return false;
  }
  if (item.useVideoContent === true) {
    return true;
  }
  return !!item.video?.externalVideoId?.trim();
}

