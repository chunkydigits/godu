import { BehaviorSubject, Observable, Subject } from 'rxjs';
import {
  ControllableVideoPlayer,
  VideoPlayerTimeUpdate,
} from '../../../models/video-player.interface';

interface TikTokPlayerMessage<T = unknown> {
  'x-tiktok-player'?: boolean;
  type?: string;
  value?: T;
}

interface EmbedOptions {
  autoplay: boolean;
}

/**
 * TikTok Embed Player adapter.
 * Isolates all TikTok postMessage / iframe details behind VideoPlayer.
 *
 * Note: postMessage `play` alone often fails until the embed has unlocked
 * media. `kickstartFromUserGesture` remounts with autoplay=1 inside the
 * user-click stack, which is the reliable Start path.
 */
export class TikTokVideoPlayer implements ControllableVideoPlayer {
  private iframe: HTMLIFrameElement | null = null;
  private currentTimeSeconds = 0;
  private durationSeconds = 0;
  private destroyed = false;
  private pendingSeekSeconds: number | null = null;
  private wantPlaying = false;

  private readonly readySubject = new BehaviorSubject<boolean>(false);
  private readonly timeUpdatesSubject = new Subject<VideoPlayerTimeUpdate>();
  private readonly onMessage = (event: MessageEvent<TikTokPlayerMessage>) =>
    this.handleMessage(event);

  readonly ready: Observable<boolean> = this.readySubject.asObservable();
  readonly timeUpdates: Observable<VideoPlayerTimeUpdate> =
    this.timeUpdatesSubject.asObservable();

  constructor(
    private readonly hostElement: HTMLElement,
    private readonly externalVideoId: string,
  ) {}

  async initialise(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    window.addEventListener('message', this.onMessage);
    this.mountIframe({ autoplay: false });
  }

  /**
   * Call synchronously from a click handler. Remounts the embed with autoplay
   * so TikTok actually starts without requiring the in-iframe play button.
   */
  kickstartFromUserGesture(startSeconds: number): void {
    if (this.destroyed) {
      return;
    }

    this.wantPlaying = true;
    this.pendingSeekSeconds = startSeconds;
    this.currentTimeSeconds = startSeconds;
    this.mountIframe({ autoplay: true });
    this.postControlCommands(startSeconds);
  }

  async play(): Promise<void> {
    this.wantPlaying = true;
    this.post('unMute');
    this.post('play');
  }

  async pause(): Promise<void> {
    this.wantPlaying = false;
    this.post('pause');
  }

  async seek(seconds: number): Promise<void> {
    this.pendingSeekSeconds = seconds;
    this.currentTimeSeconds = seconds;
    this.post('seekTo', seconds);
  }

  async getCurrentTime(): Promise<number> {
    return this.currentTimeSeconds;
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    this.wantPlaying = false;
    this.pendingSeekSeconds = null;
    window.removeEventListener('message', this.onMessage);
    this.readySubject.next(false);
    this.hostElement.replaceChildren();
    this.iframe = null;
    this.readySubject.complete();
    this.timeUpdatesSubject.complete();
  }

  private mountIframe(options: EmbedOptions): void {
    this.readySubject.next(false);

    const iframe = document.createElement('iframe');
    iframe.src = this.buildEmbedUrl(options);
    iframe.title = 'TikTok video';
    // autoplay feature policy is required for programmatic / URL autoplay
    iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.style.display = 'block';

    this.hostElement.replaceChildren(iframe);
    this.iframe = iframe;
  }

  private buildEmbedUrl(options: EmbedOptions): string {
    const params = new URLSearchParams({
      // Hide TikTok chrome — we own Start / Pause UI
      controls: '0',
      progress_bar: '0',
      play_button: '0',
      volume_control: '0',
      fullscreen_button: '0',
      timestamp: '0',
      loop: '0',
      autoplay: options.autoplay ? '1' : '0',
      // Muted autoplay is what browsers allow from an embed remount;
      // we unMute via postMessage as soon as the player is ready.
      muted: options.autoplay ? '1' : '0',
      music_info: '0',
      description: '0',
      rel: '0',
      closed_caption: '0',
    });

    return `https://www.tiktok.com/player/v1/${this.externalVideoId}?${params.toString()}`;
  }

  private postControlCommands(startSeconds: number): void {
    this.post('seekTo', startSeconds);
    this.post('play');
    this.post('unMute');
  }

  private post(type: string, value?: unknown): void {
    if (!this.iframe?.contentWindow) {
      return;
    }

    const message: TikTokPlayerMessage =
      value === undefined
        ? { 'x-tiktok-player': true, type }
        : { 'x-tiktok-player': true, type, value };

    // Official TikTok embed examples use '*'.
    this.iframe.contentWindow.postMessage(message, '*');
  }

  private handleMessage(event: MessageEvent<TikTokPlayerMessage>): void {
    if (event.origin !== 'https://www.tiktok.com') {
      return;
    }

    const data = event.data;
    if (!data || data['x-tiktok-player'] !== true || !data.type) {
      return;
    }

    switch (data.type) {
      case 'onPlayerReady':
        this.readySubject.next(true);
        if (this.pendingSeekSeconds != null || this.wantPlaying) {
          const seekTo = this.pendingSeekSeconds ?? this.currentTimeSeconds;
          this.postControlCommands(seekTo);
        }
        break;
      case 'onStateChange': {
        const state = data.value as number | undefined;
        // 2 = paused, 1 = playing. If we want playing but got paused after ready, nudge again.
        if (this.wantPlaying && state === 2) {
          this.post('play');
        }
        break;
      }
      case 'onPlayerError': {
        const error = data.value as { errorCode?: number; errorType?: string } | undefined;
        if (error?.errorType === 'AUTOPLAY_ERROR' || error?.errorCode === 3002) {
          // Last resort inside already-unlocked session: try play again unmuted.
          this.post('unMute');
          this.post('play');
        }
        break;
      }
      case 'onCurrentTime': {
        const value = data.value as { currentTime?: number; duration?: number } | undefined;
        if (!value) {
          return;
        }
        this.currentTimeSeconds = value.currentTime ?? 0;
        this.durationSeconds = value.duration ?? this.durationSeconds;
        this.timeUpdatesSubject.next({
          currentTime: this.currentTimeSeconds,
          duration: this.durationSeconds,
        });
        break;
      }
      default:
        break;
    }
  }
}
