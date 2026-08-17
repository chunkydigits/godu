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
