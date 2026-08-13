import { StepsItemStatus } from './steps-item-status.enum';
import { StepsVisibility } from './steps-visibility.enum';
import { StepDefinition } from './step-definition.model';
import { VideoReference } from './video-reference.model';

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
  video: VideoReference;
  steps: StepDefinition[];
  createdUtc: string;
  updatedUtc?: string;
  publishedUtc?: string;
}
