import { MeProfile } from '../../../core/auth/me.model';

export type CreatorTrialPanelKind = 'hidden' | 'trial' | 'expired' | 'unmetered';

export interface CreatorTrialPanel {
  kind: CreatorTrialPanelKind;
  title: string;
  body: string;
  remaining: string | null;
}

const hidden: CreatorTrialPanel = {
  kind: 'hidden',
  title: '',
  body: '',
  remaining: null,
};

export function formatGbp(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

export function remainingLabel(endsAtIso: string, now: Date = new Date()): string | null {
  const end = new Date(endsAtIso);
  if (Number.isNaN(end.getTime())) {
    return null;
  }

  const ms = end.getTime() - now.getTime();
  if (ms <= 0) {
    return null;
  }

  const days = Math.floor(ms / 86_400_000);
  if (days >= 2) {
    return `${days} days left`;
  }
  if (days === 1) {
    return '1 day left';
  }

  const hours = Math.ceil(ms / 3_600_000);
  if (hours >= 2) {
    return `${hours} hours left`;
  }
  if (hours === 1) {
    return '1 hour left';
  }

  return 'Less than an hour left';
}

export function formatLocalDate(iso: string, locale?: string): string | null {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value.toLocaleDateString(locale, { dateStyle: 'long' });
}

export function creatorTrialPanel(
  profile: MeProfile | null,
  now: Date = new Date(),
  locale?: string,
): CreatorTrialPanel {
  if (!profile?.entitlement) {
    return hidden;
  }

  const entitlement = profile.entitlement;
  if (entitlement.trialClockSkipped) {
    return {
      kind: 'unmetered',
      title: 'Creator publishing',
      body: 'Creator publishing is not metered on this account.',
      remaining: null,
    };
  }

  if (entitlement.status === 'trial' && entitlement.trialEndsAt) {
    const endsOn = formatLocalDate(entitlement.trialEndsAt, locale);
    return {
      kind: 'trial',
      title: 'Creator trial',
      body: endsOn
        ? `Public creator publishing is a 3-month free trial. It ends on ${endsOn}.`
        : 'Public creator publishing is a 3-month free trial.',
      remaining: remainingLabel(entitlement.trialEndsAt, now),
    };
  }

  const expired =
    entitlement.status === 'expired' ||
    (!entitlement.hasActiveEntitlement && !!entitlement.trialStartedAt);
  if (expired) {
    const price = formatGbp(profile.monthlyPriceGbp || 9.99);
    return {
      kind: 'expired',
      title: 'Creator trial ended',
      body:
        `Public Godus and your public creator page are off until a ${price}/month subscription is available. ` +
        'You can still create and play private Godus. Previously public Godus will come back on together when you subscribe.',
      remaining: null,
    };
  }

  return hidden;
}
