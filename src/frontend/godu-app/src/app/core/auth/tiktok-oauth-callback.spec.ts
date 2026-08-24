import { describe, expect, it } from 'vitest';
import { isTikTokOAuthCallbackPath } from './tiktok-oauth-callback';

describe('TikTok OAuth callback path', () => {
  it('matches the Login Kit return route', () => {
    expect(isTikTokOAuthCallbackPath('/tiktok/callback')).toBe(true);
    expect(isTikTokOAuthCallbackPath('/tiktok/callback/')).toBe(true);
  });

  it('does not match Auth0 origin, creator pages, or public Godus', () => {
    expect(isTikTokOAuthCallbackPath('/')).toBe(false);
    expect(isTikTokOAuthCallbackPath('/settings')).toBe(false);
    expect(isTikTokOAuthCallbackPath('/tiktok/coach')).toBe(false);
    expect(isTikTokOAuthCallbackPath('/tiktok/coach/morning-flow')).toBe(false);
    expect(isTikTokOAuthCallbackPath('/t/callback')).toBe(false);
  });
});
