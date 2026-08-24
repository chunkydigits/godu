import { environment } from '../../../environments/environment';

export function isTikTokOAuthCallbackPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return normalized === '/tiktok/callback';
}

function windowPathname(): string {
  return typeof window === 'undefined' ? '' : window.location.pathname;
}

function windowSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search;
}

/** True when this document load is TikTok Login Kit returning to the SPA. */
export const isTikTokOAuthCallback = isTikTokOAuthCallbackPath(windowPathname());

/**
 * Captured at module load so Auth0 cannot strip `code`/`state` before we bounce
 * to the API.
 */
export const tikTokOAuthCallbackSearch = isTikTokOAuthCallback ? windowSearch() : '';

export function tikTokOAuthApiCallbackTarget(
  search: string = tikTokOAuthCallbackSearch || windowSearch(),
): string {
  return `${environment.apiBaseUrl}/api/me/platform-accounts/tiktok/callback${search}`;
}
