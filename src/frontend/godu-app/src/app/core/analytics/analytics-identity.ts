export const GODU_ANON_ID_KEY = 'godu_anon_id';
export const GODU_SESSION_ID_KEY = 'godu_session_id';
export const GODU_UTM_FIRST_KEY = 'godu_utm_first';
export const GODU_ANALYTICS_ONCE_KEY = 'godu_analytics_once';

export function readOrCreateId(storage: Storage | null, key: string, createId: () => string): string {
  if (!storage) {
    return createId();
  }

  const existing = storage.getItem(key)?.trim();
  if (existing) {
    return existing;
  }

  const created = createId();
  storage.setItem(key, created);
  return created;
}

export function browserStorage(kind: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export interface FirstTouchUtm {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export function captureFirstTouchUtm(
  storage: Storage | null,
  params: { source?: string | null; medium?: string | null; campaign?: string | null },
): FirstTouchUtm | null {
  const incoming: FirstTouchUtm = {};
  if (params.source) {
    incoming.utmSource = params.source;
  }
  if (params.medium) {
    incoming.utmMedium = params.medium;
  }
  if (params.campaign) {
    incoming.utmCampaign = params.campaign;
  }

  if (Object.keys(incoming).length === 0) {
    return readStoredUtm(storage);
  }

  if (storage && !storage.getItem(GODU_UTM_FIRST_KEY)) {
    storage.setItem(GODU_UTM_FIRST_KEY, JSON.stringify(incoming));
  }

  return readStoredUtm(storage) ?? incoming;
}

function readStoredUtm(storage: Storage | null): FirstTouchUtm | null {
  const raw = storage?.getItem(GODU_UTM_FIRST_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as FirstTouchUtm;
  } catch {
    return null;
  }
}
