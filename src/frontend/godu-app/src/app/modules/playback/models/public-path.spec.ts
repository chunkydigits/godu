import { describe, expect, it } from 'vitest';
import {
  isValidSlug,
  publicAlias,
  publicCreatorPath,
  publicViewerPath,
  shouldReplaceCanonicalPath,
  slugFromTitle,
  viewerBackPath,
  viewerBackPathFromUrl,
} from './public-path';

describe('public paths', () => {
  it('maps TikTok to the short public alias', () => {
    expect(publicAlias('tiktok')).toBe('t');
    expect(publicAlias('TikTok')).toBe('t');
  });

  it('builds a creator catalogue path', () => {
    expect(publicCreatorPath('tiktok', '@Coach')).toBe('/t/coach');
  });

  it('returns the creator catalogue from a public viewer route', () => {
    expect(viewerBackPath({ provider: 'tiktok', username: 'coach' })).toBe('/t/coach');
  });

  it('returns my-steps from a library play route', () => {
    expect(viewerBackPath({ playId: 'steps_abc', isDemo: false })).toBe('/my-steps');
  });

  it('returns demos from a demo play route', () => {
    expect(viewerBackPath({ playId: 'steps_demo_fitness', isDemo: true })).toBe('/demos');
  });

  it('reads the current viewer url instead of navigation history', () => {
    const isDemo = (id: string) => id.startsWith('steps_demo');
    expect(viewerBackPathFromUrl('/play/steps_abc', isDemo)).toBe('/my-steps');
    expect(viewerBackPathFromUrl('/play/steps_demo_fitness', isDemo)).toBe('/demos');
    expect(viewerBackPathFromUrl('/t/adrb1984/morning-flow', isDemo)).toBe('/t/adrb1984');
  });

  it('prefers a stored public path', () => {
    expect(
      publicViewerPath({
        publicPath: '/t/coach/morning',
        slug: 'ignored',
        video: { provider: 'tiktok', creatorUsername: 'other' },
      }),
    ).toBe('/t/coach/morning');
  });

  it('replaces an alias viewer url with the current handle', () => {
    expect(shouldReplaceCanonicalPath('/t/oldname/stretch', '/t/newname/stretch')).toBe(true);
    expect(shouldReplaceCanonicalPath('/t/newname/stretch', '/t/newname/stretch')).toBe(false);
    expect(shouldReplaceCanonicalPath('/t/oldname', '/t/newname')).toBe(true);
  });

  it('builds a viewer path from provider, handle and slug', () => {
    expect(
      publicViewerPath({
        slug: 'Morning-Flow',
        video: { provider: 'tiktok', creatorUsername: '@Coach' },
      }),
    ).toBe('/t/coach/morning-flow');
  });
});

describe('slugFromTitle', () => {
  it('turns a title into a lowercase dashed slug', () => {
    expect(slugFromTitle('Morning Flow')).toBe('morning-flow');
  });

  it('keeps dots and underscores and drops other punctuation', () => {
    expect(slugFromTitle('Coach_Amy’s 5.0!')).toBe('coach_amys-5.0');
  });

  it('caps length at 80 characters', () => {
    expect(slugFromTitle('a'.repeat(90)).length).toBe(80);
  });

  it('returns empty when nothing usable remains', () => {
    expect(slugFromTitle('!!!')).toBe('');
  });
});

describe('isValidSlug', () => {
  it('allows letters, numbers, dots, dashes and underscores', () => {
    expect(isValidSlug('morning-flow_v2.1')).toBe(true);
    expect(isValidSlug('Morning')).toBe(false);
    expect(isValidSlug('has space')).toBe(false);
  });
});
