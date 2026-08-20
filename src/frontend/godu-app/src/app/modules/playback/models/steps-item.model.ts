import { StepsItemStatus } from './steps-item-status.enum';
import { StepsVisibility } from './steps-visibility.enum';
import { StepDefinition } from './step-definition.model';
import { VideoReference } from './video-reference.model';
import { CreatorSocial } from './creator-link';

export interface StepsItem {
  id: string;
  createdByUserId: string;
  linkedPlatformAccountId?: string | null;
  visibility: StepsVisibility;
  status: StepsItemStatus;
  slug?: string;
  title: string;
  description?: string;
  creatorDisplayName?: string;
  creatorSocials?: CreatorSocial[];
  video: VideoReference;
  steps: StepDefinition[];
  /**
   * When true, timed steps use a continuous full-video soundtrack (looped)
   * while visual clips play muted. Untimed steps keep normal segment audio.
   */
  continuousSoundtrack?: boolean;
  /** Optional rest between steps, in whole seconds. */
  gapSeconds?: number | null;
  /** Optional copy shown with the between-step countdown. */
  gapMessage?: string | null;
  createdUtc: string;
  updatedUtc?: string;
  publishedUtc?: string;
  publicPath?: string;
}
