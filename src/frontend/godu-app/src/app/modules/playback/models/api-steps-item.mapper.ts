import { ApiStepsItem } from './api-steps-item.model';
import { publicViewerPath } from './public-path';
import { StepDefinition } from './step-definition.model';
import { stepEntryKind } from './step-entry';
import { StepsItem } from './steps-item.model';
import { StepsItemStatus } from './steps-item-status.enum';
import { StepsVisibility } from './steps-visibility.enum';
import { VideoProvider } from './video-provider.enum';
import { VideoReference } from './video-reference.model';

export function mapApiStepsItem(api: ApiStepsItem): StepsItem {
  return {
    id: api.id,
    createdByUserId: api.createdByUserId,
    linkedPlatformAccountId: api.linkedPlatformAccountId ?? null,
    visibility: parseVisibility(api.visibility),
    status: parseStatus(api.status),
    slug: api.slug ?? undefined,
    title: api.title,
    description: api.description ?? undefined,
    creatorDisplayName: api.creatorDisplayName ?? undefined,
    creatorSocials: api.creatorSocials?.filter((s) => s.profileUrl) ?? undefined,
    continuousSoundtrack: api.continuousSoundtrack,
    gapSeconds: api.gapSeconds ?? null,
    gapMessage: api.gapMessage ?? undefined,
    createdUtc: api.createdUtc,
    updatedUtc: api.updatedUtc,
    publishedUtc: api.publishedUtc ?? undefined,
    publicPath: api.publicPath ?? publicViewerPath(api) ?? undefined,
    video: mapVideo(api.video),
    steps: api.steps.map(mapStep),
  };
}

function mapVideo(video: ApiStepsItem['video']): VideoReference {
  return {
    provider: parseProvider(video.provider),
    externalVideoId: video.externalVideoId,
    sourceUrl: video.sourceUrl,
    creatorExternalAccountId: video.creatorExternalAccountId ?? undefined,
    creatorUsername: video.creatorUsername ?? undefined,
    thumbnailUrl: video.thumbnailUrl ?? undefined,
    durationSeconds: video.durationSeconds ?? undefined,
  };
}

function mapStep(step: ApiStepsItem['steps'][number]): StepDefinition {
  return {
    id: step.id,
    order: step.order,
    kind: stepEntryKind(step),
    title: step.title,
    description: step.description ?? undefined,
    startSeconds: step.startSeconds,
    endSeconds: step.endSeconds,
    durationSeconds: step.durationSeconds ?? null,
    autoAdvance: step.autoAdvance,
    message: step.message ?? null,
  };
}

function parseVisibility(value: string): StepsVisibility {
  switch (value.toLowerCase()) {
    case StepsVisibility.Public:
      return StepsVisibility.Public;
    case StepsVisibility.Unlisted:
      return StepsVisibility.Unlisted;
    default:
      return StepsVisibility.Private;
  }
}

function parseStatus(value: string): StepsItemStatus {
  switch (value.toLowerCase()) {
    case StepsItemStatus.Draft:
      return StepsItemStatus.Draft;
    case StepsItemStatus.Archived:
      return StepsItemStatus.Archived;
    default:
      return StepsItemStatus.Published;
  }
}

function parseProvider(value: string): VideoProvider {
  switch (value.toLowerCase()) {
    case VideoProvider.YouTube:
      return VideoProvider.YouTube;
    case VideoProvider.Instagram:
      return VideoProvider.Instagram;
    case VideoProvider.Vimeo:
      return VideoProvider.Vimeo;
    default:
      return VideoProvider.TikTok;
  }
}
