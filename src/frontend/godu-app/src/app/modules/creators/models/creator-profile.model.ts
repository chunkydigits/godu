export interface CreatorSocial {
  provider: string;
  username: string;
  profileUrl: string;
  displayName?: string | null;
}

export interface ProfileLink {
  id: string;
  title: string;
  url: string;
}

export interface PublicStepsSummary {
  id: string;
  title: string;
  description?: string | null;
  slug: string;
  provider: string;
  username: string;
  stepCount: number;
  publicPath?: string | null;
}

export interface CreatorProfile {
  userId: string;
  displayName: string;
  bio?: string | null;
  profileImageUrl?: string | null;
  socials: CreatorSocial[];
  externalLinks?: ProfileLink[];
  publishedSteps?: PublicStepsSummary[];
}

export interface UpdateCreatorProfileRequest {
  displayName?: string | null;
  bio?: string | null;
  profileImageUrl?: string | null;
}
