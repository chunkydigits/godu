export interface ApiStepDefinition {
  id: string;
  order: number;
  title: string;
  description?: string | null;
  startSeconds: number;
  endSeconds: number;
  durationSeconds?: number | null;
  autoAdvance: boolean;
}

export interface ApiVideoReference {
  provider: string;
  externalVideoId: string;
  sourceUrl: string;
  creatorExternalAccountId?: string | null;
  creatorUsername?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
}

export interface ApiStepsItem {
  id: string;
  createdByUserId: string;
  linkedPlatformAccountId?: string | null;
  visibility: string;
  status: string;
  slug?: string | null;
  title: string;
  description?: string | null;
  creatorDisplayName?: string | null;
  continuousSoundtrack: boolean;
  video: ApiVideoReference;
  steps: ApiStepDefinition[];
  createdUtc: string;
  updatedUtc: string;
  publishedUtc?: string | null;
}

export interface ApiStepDefinitionRequest {
  id?: string | null;
  order: number;
  title: string;
  description?: string | null;
  startSeconds: number;
  endSeconds: number;
  durationSeconds?: number | null;
  autoAdvance: boolean;
}

export interface ApiVideoReferenceRequest {
  provider: string;
  externalVideoId: string;
  sourceUrl: string;
  creatorExternalAccountId?: string | null;
  creatorUsername?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
}

export interface CreateStepsItemRequest {
  title: string;
  description?: string | null;
  creatorDisplayName?: string | null;
  slug?: string | null;
  continuousSoundtrack: boolean;
  video: ApiVideoReferenceRequest;
  steps: ApiStepDefinitionRequest[];
}

export type UpdateStepsItemRequest = CreateStepsItemRequest;
