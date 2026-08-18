export interface CreatorSocial {
  provider: string;
  username: string;
  profileUrl: string;
  displayName?: string | null;
}

export interface CreatorProfile {
  userId: string;
  displayName: string;
  socials: CreatorSocial[];
}
