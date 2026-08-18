import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TikTokVideoPlayer } from './tiktok-video-player';

const TIKTOK_ORIGIN = 'https://www.tiktok.com';

describe('TikTokVideoPlayer', () => {
  let host: HTMLElement;
  let player: TikTokVideoPlayer;
  let posted: { type?: string; value?: unknown }[];

  /** The embed only listens once loaded, so ready is when commands can land. */
  function announceReady(): void {
    const iframe = host.querySelector('iframe')!;
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { 'x-tiktok-player': true, type: 'onPlayerReady' },
        origin: TIKTOK_ORIGIN,
        source: iframe.contentWindow,
      }),
    );
  }

  function types(): (string | undefined)[] {
    return posted.map((message) => message.type);
  }

  function spyOnPost(): void {
    posted = [];
    const iframe = host.querySelector('iframe')!;
    vi.spyOn(iframe.contentWindow!, 'postMessage').mockImplementation(
      (message: unknown) => {
        posted.push(message as { type?: string; value?: unknown });
      },
    );
  }

  beforeEach(async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    player = new TikTokVideoPlayer(host, '123');
    await player.initialise();
    spyOnPost();
  });

  afterEach(async () => {
    await player.destroy();
    host.remove();
  });

  it('replays a pending seek without playing when playback was not requested', async () => {
    await player.pause();
    await player.seek(12);
    posted = [];

    announceReady();

    expect(posted).toEqual(
      expect.arrayContaining([{ 'x-tiktok-player': true, type: 'seekTo', value: 12 }]),
    );
    expect(types()).toContain('pause');
    expect(types()).not.toContain('play');
  });

  it('remounts the embed with autoplay on a user gesture', () => {
    const before = host.querySelector('iframe');
    expect(before?.src).toContain('autoplay=0');

    player.kickstartFromUserGesture(12, { muted: true });

    const after = host.querySelector('iframe');
    expect(after).not.toBe(before);
    expect(after?.allow).toContain('autoplay');
    expect(after?.src).toContain('autoplay=1');
    expect(after?.src).toContain('muted=1');
  });

  it('plays on ready when a user gesture asked for playback', () => {
    player.kickstartFromUserGesture(12, { muted: true });
    posted = [];
    spyOnPost();

    announceReady();

    expect(types()).toContain('play');
    expect(types()).toContain('seekTo');
    expect(types()).not.toContain('pause');
  });

  it('reports playing only while the embed says so', async () => {
    const seen: boolean[] = [];
    player.isPlaying.subscribe((value) => seen.push(value));
    const iframe = host.querySelector('iframe')!;

    for (const state of [3, 1, 2]) {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { 'x-tiktok-player': true, type: 'onStateChange', value: state },
          origin: TIKTOK_ORIGIN,
          source: iframe.contentWindow,
        }),
      );
    }

    expect(seen).toEqual([false, true, false]);
  });

  it('ignores messages that are not from the embed', () => {
    const iframe = host.querySelector('iframe')!;
    const seen: boolean[] = [];
    player.isPlaying.subscribe((value) => seen.push(value));

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { 'x-tiktok-player': true, type: 'onStateChange', value: 1 },
        origin: 'https://evil.example',
        source: iframe.contentWindow,
      }),
    );

    expect(seen).toEqual([false]);
  });
});
