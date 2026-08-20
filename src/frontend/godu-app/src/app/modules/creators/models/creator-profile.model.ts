export interface CreatorSocial {
  provider: string;
  username: string;
  profileUrl: string;
  displayName?: string | null;
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
  socials: CreatorSocial[];
  publishedSteps?: PublicStepsSummary[];
}
