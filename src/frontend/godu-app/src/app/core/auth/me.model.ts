export interface CreatorEntitlement {
  status: string;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  subscriptionStartedAt?: string | null;
  subscriptionEndsAt?: string | null;
  hasActiveEntitlement: boolean;
  trialClockSkipped: boolean;
  canPublishPublic: boolean;
}

export interface MeProfile {
  userId: string;
  displayName: string;
  isAdmin: boolean;
  isInternal: boolean;
  canPublishPublic: boolean;
  monthlyPriceGbp: number;
  entitlement: CreatorEntitlement;
}
