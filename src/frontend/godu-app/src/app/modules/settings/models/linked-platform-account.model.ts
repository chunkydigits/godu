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
  usernameAliases?: string[];
  isVerified: boolean;
  verifiedUtc?: string | null;
  createdUtc: string;
  updatedUtc: string;
}

export interface PlatformConnectStart {
  provider: string;
  authorizationUrl: string;
}

export interface RefreshHandleResult {
  account: LinkedPlatformAccount;
  handleChanged: boolean;
  previousUsername?: string | null;
  updatedStepsCount: number;
}
