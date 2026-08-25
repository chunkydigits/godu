import { describe, expect, it } from 'vitest';
import { CreatorEntitlement, MeProfile } from '../../../core/auth/me.model';
import {
  creatorTrialPanel,
  formatGbp,
  remainingLabel,
} from './creator-trial-panel';

function entitlement(overrides: Partial<CreatorEntitlement> = {}): CreatorEntitlement {
  return {
    status: 'notStarted',
    hasActiveEntitlement: false,
    trialClockSkipped: false,
    canPublishPublic: true,
    ...overrides,
  };
}

function profile(overrides: Partial<MeProfile> = {}): MeProfile {
  return {
    userId: 'usr_1',
    displayName: 'Ada',
    isAdmin: false,
    isInternal: false,
    canPublishPublic: true,
    monthlyPriceGbp: 9.99,
    entitlement: entitlement(),
    ...overrides,
  };
}

describe('creatorTrialPanel', () => {
  it('hides the panel before a trial starts', () => {
    expect(creatorTrialPanel(profile()).kind).toBe('hidden');
    expect(creatorTrialPanel(null).kind).toBe('hidden');
  });

  it('shows remaining time while the trial is in date', () => {
    const now = new Date('2026-03-01T12:00:00Z');
    const panel = creatorTrialPanel(
      profile({
        entitlement: entitlement({
          status: 'trial',
          trialStartedAt: '2026-02-01T12:00:00Z',
          trialEndsAt: '2026-05-01T12:00:00Z',
          hasActiveEntitlement: true,
          canPublishPublic: true,
        }),
      }),
      now,
      'en-GB',
    );

    expect(panel.kind).toBe('trial');
    expect(panel.body).toContain('3-month free trial');
    expect(panel.body).toContain('1 May 2026');
    expect(panel.remaining).toBe('61 days left');
  });

  it('explains reactivation after expiry', () => {
    const panel = creatorTrialPanel(
      profile({
        canPublishPublic: false,
        entitlement: entitlement({
          status: 'expired',
          trialStartedAt: '2026-01-01T00:00:00Z',
          trialEndsAt: '2026-04-01T00:00:00Z',
          hasActiveEntitlement: false,
          canPublishPublic: false,
        }),
      }),
    );

    expect(panel.kind).toBe('expired');
    expect(panel.body).toContain('£9.99/month');
    expect(panel.body).toContain('private Godus');
    expect(panel.remaining).toBeNull();
  });

  it('omits a countdown for unmetered admin accounts', () => {
    const panel = creatorTrialPanel(
      profile({
        isAdmin: true,
        entitlement: entitlement({
          trialClockSkipped: true,
          hasActiveEntitlement: true,
          canPublishPublic: true,
        }),
      }),
    );

    expect(panel.kind).toBe('unmetered');
    expect(panel.body).toContain('not metered');
    expect(panel.remaining).toBeNull();
  });
});

describe('remainingLabel', () => {
  it('uses whole days when more than a day remains', () => {
    expect(remainingLabel('2026-03-03T12:00:00Z', new Date('2026-03-01T12:00:00Z'))).toBe(
      '2 days left',
    );
  });

  it('uses hours on the last day', () => {
    expect(remainingLabel('2026-03-01T18:00:00Z', new Date('2026-03-01T12:00:00Z'))).toBe(
      '6 hours left',
    );
  });

  it('counts a full remaining day as 1 day left', () => {
    expect(remainingLabel('2026-03-02T12:00:00Z', new Date('2026-03-01T12:00:00Z'))).toBe(
      '1 day left',
    );
  });

  it('returns null after the end', () => {
    expect(remainingLabel('2026-03-01T12:00:00Z', new Date('2026-03-01T12:00:01Z'))).toBeNull();
  });
});

describe('formatGbp', () => {
  it('formats the configured price', () => {
    expect(formatGbp(9.99)).toBe('£9.99');
  });
});
