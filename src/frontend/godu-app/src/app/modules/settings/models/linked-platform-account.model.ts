export interface LinkedPlatformAccount {
  id: string;
  userId: string;
  provider: string;
  externalAccountId: string;
  username: string;
  displayName?: string | null;
  profileUrl?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  isVerified: boolean;
  verifiedUtc?: string | null;
  createdUtc: string;
  updatedUtc: string;
}

export interface PlatformConnectStart {
  provider: string;
  authorizationUrl: string;
}
