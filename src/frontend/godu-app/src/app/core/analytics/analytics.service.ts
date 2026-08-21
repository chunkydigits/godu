import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { EMPTY, catchError, distinctUntilChanged, filter } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AnalyticsEvent, AnalyticsEventName } from './analytics-event';
import {
  GODU_ANON_ID_KEY,
  GODU_SESSION_ID_KEY,
  GODU_ANALYTICS_ONCE_KEY,
  browserStorage,
  captureFirstTouchUtm,
  readOrCreateId,
} from './analytics-identity';
import { AnalyticsTrackProperties, IngestAnalyticsEventRequest } from './analytics.models';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly endpoint = `${environment.apiBaseUrl}/api/analytics/events`;
  private readonly once = loadOnceKeys();
  private started = false;

  readonly anonymousId = readOrCreateId(
    browserStorage('local'),
    GODU_ANON_ID_KEY,
    newId,
  );
  readonly sessionId = readOrCreateId(
    browserStorage('session'),
    GODU_SESSION_ID_KEY,
    newId,
  );

  initialize(): void {
    if (this.started || typeof window === 'undefined') {
      return;
    }

    this.started = true;
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.onNavigation(event.urlAfterRedirects));

    this.auth.isAuthenticated$
      .pipe(distinctUntilChanged())
      .subscribe((authenticated) => {
        if (authenticated) {
          this.trackOnce('login', AnalyticsEvent.LoginCompleted);
        }
      });
  }

  track(eventName: AnalyticsEventName, properties: AnalyticsTrackProperties = {}): void {
    try {
      const { goduId, platform, sourceCreatorHandle, ...rest } = properties;
      const payload: IngestAnalyticsEventRequest = {
        eventName,
        anonymousId: this.anonymousId,
        sessionId: this.sessionId,
        goduId: goduId || undefined,
        platform: platform || undefined,
        sourceCreatorHandle: sourceCreatorHandle || undefined,
        referrer: typeof document === 'undefined' ? undefined : document.referrer || undefined,
        path: typeof window === 'undefined' ? undefined : window.location.pathname,
        properties: stripEmpty(rest),
      };

      this.http
        .post(this.endpoint, payload)
        .pipe(catchError(() => EMPTY))
        .subscribe();
    } catch {
      // Analytics must never affect product flows.
    }
  }

  trackOnce(
    key: string,
    eventName: AnalyticsEventName,
    properties: AnalyticsTrackProperties = {},
  ): void {
    if (this.once.has(key)) {
      return;
    }

    this.once.add(key);
    persistOnceKeys(this.once);
    this.track(eventName, properties);
  }

  private onNavigation(url: string): void {
    const path = url.split('?')[0] || '/';
    const params = new URLSearchParams(url.includes('?') ? url.slice(url.indexOf('?') + 1) : '');
    const utm = captureFirstTouchUtm(browserStorage('local'), {
      source: params.get('utm_source'),
      medium: params.get('utm_medium'),
      campaign: params.get('utm_campaign'),
    });

    this.track(AnalyticsEvent.PageViewed, {
      route: path,
      ...utm,
    });

    if (path === '/') {
      this.trackOnce('landing', AnalyticsEvent.LandingPageViewed, { route: path, ...utm });
    }
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function stripEmpty(
  properties: AnalyticsTrackProperties,
): Record<string, string | number | boolean | null> | undefined {
  const result: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return Object.keys(result).length === 0 ? undefined : result;
}

function loadOnceKeys(): Set<string> {
  const raw = browserStorage('session')?.getItem(GODU_ANALYTICS_ONCE_KEY);
  if (!raw) {
    return new Set();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? new Set(parsed.filter((key): key is string => typeof key === 'string'))
      : new Set();
  } catch {
    return new Set();
  }
}

function persistOnceKeys(once: Set<string>): void {
  try {
    browserStorage('session')?.setItem(GODU_ANALYTICS_ONCE_KEY, JSON.stringify([...once]));
  } catch {
    // Session storage can be unavailable; in-memory once still applies.
  }
}
