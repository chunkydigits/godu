import { describe, expect, it } from 'vitest';
import {
  buildTikTokSourceUrl,
  canonicalTikTokShortUrl,
  formatCreatorDisplayName,
  importedTikTokHandle,
  parseTikTokVideo,
  parseTikTokVideoId,
  suggestTitleFromTikTok,
} from './tiktok-video-id';

describe('parseTikTokVideoId', () => {
  it('accepts a raw numeric id', () => {
    expect(parseTikTokVideoId('7668570367119691030')).toBe('7668570367119691030');
  });

  it('extracts id from a standard TikTok URL', () => {
    expect(
      parseTikTokVideoId(
        'https://www.tiktok.com/@mydisciplinedrive/video/7668570367119691030',
      ),
    ).toBe('7668570367119691030');
  });

  it('extracts id from a URL with query string', () => {
    expect(
      parseTikTokVideoId(
        'https://www.tiktok.com/@lagomchef/video/7667587928620600609?is_from_webapp=1',
      ),
    ).toBe('7667587928620600609');
  });

  it('returns null for blank, invalid, or mobile share links', () => {
    expect(parseTikTokVideoId('')).toBeNull();
    expect(parseTikTokVideoId('not-a-video')).toBeNull();
    expect(parseTikTokVideoId('https://vm.tiktok.com/ZN8Nemy3d/')).toBeNull();
  });
});

describe('parseTikTokVideo', () => {
  it('extracts username and id from a standard URL', () => {
    const parsed = parseTikTokVideo(
      'https://www.tiktok.com/@mydisciplinedrive/video/7668570367119691030',
    );
    expect(parsed).toEqual({
      videoId: '7668570367119691030',
      username: 'mydisciplinedrive',
      sourceUrl: 'https://www.tiktok.com/@mydisciplinedrive/video/7668570367119691030',
    });
  });

  it('returns null username for bare id', () => {
    expect(parseTikTokVideo('7668570367119691030')).toEqual({
      videoId: '7668570367119691030',
      username: null,
      sourceUrl: 'https://www.tiktok.com/@video/video/7668570367119691030',
    });
  });
});

describe('buildTikTokSourceUrl', () => {
  it('builds a canonical watch URL', () => {
    expect(buildTikTokSourceUrl('12345', '@coach')).toBe(
      'https://www.tiktok.com/@coach/video/12345',
    );
  });
});

describe('importedTikTokHandle', () => {
  it('returns a handle without @', () => {
    expect(importedTikTokHandle('@Coach')).toBe('Coach');
  });

  it('ignores the placeholder used when the username is unknown', () => {
    expect(importedTikTokHandle('video')).toBeNull();
    expect(importedTikTokHandle('@video')).toBeNull();
    expect(importedTikTokHandle('')).toBeNull();
    expect(importedTikTokHandle(null)).toBeNull();
  });
});

describe('canonicalTikTokShortUrl', () => {
  it('accepts mobile vm.tiktok.com share links', () => {
    expect(canonicalTikTokShortUrl('https://vm.tiktok.com/ZN8Nemy3d/')).toBe(
      'https://vm.tiktok.com/ZN8Nemy3d/',
    );
    expect(canonicalTikTokShortUrl('https://vm.tiktok.com/ZN8Nemy3d')).toBe(
      'https://vm.tiktok.com/ZN8Nemy3d/',
    );
  });

  it('accepts vt.tiktok.com and /t/ share links', () => {
    expect(canonicalTikTokShortUrl('https://vt.tiktok.com/ZSabc123/')).toBe(
      'https://vt.tiktok.com/ZSabc123/',
    );
    expect(canonicalTikTokShortUrl('https://www.tiktok.com/t/ZT9xyz')).toBe(
      'https://www.tiktok.com/t/ZT9xyz/',
    );
  });

  it('rejects watch URLs and junk', () => {
    expect(
      canonicalTikTokShortUrl(
        'https://www.tiktok.com/@lagomchef/video/7667587928620600609',
      ),
    ).toBeNull();
    expect(canonicalTikTokShortUrl('https://vm.tiktok.com/')).toBeNull();
    expect(canonicalTikTokShortUrl('https://evil.example/ZN8Nemy3d/')).toBeNull();
  });
});

describe('suggestTitleFromTikTok / formatCreatorDisplayName', () => {
  it('formats creator and title suggestions', () => {
    expect(formatCreatorDisplayName('lagomchef')).toBe('@lagomchef');
    expect(suggestTitleFromTikTok('lagomchef')).toBe('Godu from @lagomchef');
    expect(suggestTitleFromTikTok(null)).toBeNull();
  });
});
