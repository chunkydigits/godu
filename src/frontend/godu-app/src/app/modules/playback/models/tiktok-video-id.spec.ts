import { describe, expect, it } from 'vitest';
import {
  buildTikTokSourceUrl,
  formatCreatorDisplayName,
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

  it('returns null for blank or invalid input', () => {
    expect(parseTikTokVideoId('')).toBeNull();
    expect(parseTikTokVideoId('not-a-video')).toBeNull();
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

describe('suggestTitleFromTikTok / formatCreatorDisplayName', () => {
  it('formats creator and title suggestions', () => {
    expect(formatCreatorDisplayName('lagomchef')).toBe('@lagomchef');
    expect(suggestTitleFromTikTok('lagomchef')).toBe('Steps from @lagomchef');
    expect(suggestTitleFromTikTok(null)).toBeNull();
  });
});
