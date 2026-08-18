import { NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import {
  ControllableVideoPlayer,
  KickstartOptions,
  VideoPlayerTimeUpdate,
} from '../../../models/video-player.interface';

interface TikTokPlayerMessage<T = unknown> {
  'x-tiktok-player'?: boolean;
  type?: string;
  value?: T;
}

interface EmbedOptions {
  autoplay: boolean;
  muted: boolean;
}

/**
 * TikTok Embed Player adapter.
 * Isolates all TikTok postMessage / iframe details behind VideoPlayer.
 */
export class TikTokVideoPlayer implements ControllableVideoPlayer {
  private iframe: HTMLIFrameElement | null = null;
  private currentTimeSeconds = 0;
  private durationSeconds = 0;
  private destroyed = false;
  private pendingSeekSeconds: number | null = null;
  private wantPlaying = false;
  private muted = false;
  private lastPlayRetryAt = 0;
  private playIntentAt = 0;
  private seekPostedAt = 0;

  private readonly readySubject = new BehaviorSubject<boolean>(false);
  private readonly isPlayingSubject = new BehaviorSubject<boolean>(false);
  private readonly timeUpdatesSubject = new Subject<VideoPlayerTimeUpdate>();
  private readonly onMessage = (event: MessageEvent<TikTokPlayerMessage>) =>
    this.handleMessage(event);

  readonly ready: Observable<boolean> = this.readySubject.asObservable();
  readonly isPlaying: Observable<boolean> = this.isPlayingSubject.asObservable();
  readonly timeUpdates: Observable<VideoPlayerTimeUpdate> =
    this.timeUpdatesSubject.asObservable();

  constructor(
    private readonly hostElement: HTMLElement,
    private readonly externalVideoId: string,
    private readonly ngZone?: NgZone,
  ) {}

  async initialise(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    const listen = () => window.addEventListener('message', this.onMessage);
    if (this.ngZone) {
      this.ngZone.runOutsideAngular(listen);
    } else {
      listen();
    }
    this.mountIframe({ autoplay: false, muted: this.muted });
  }

  kickstartFromUserGesture(startSeconds: number, options?: KickstartOptions): void {
    if (this.destroyed) {
      return;
    }

    if (options?.muted != null) {
      this.muted = options.muted;
    }

    this.wantPlaying = true;
    this.playIntentAt = Date.now();
    this.pendingSeekSeconds = startSeconds;
    this.currentTimeSeconds = startSeconds;
    this.seekPostedAt = Date.now();

    // TikTok ignores postMessage `play` on an already-paused embed. Navigating
    // a new iframe with autoplay=1 in this click stack is what actually starts it.
    this.mountIframe({ autoplay: true, muted: this.muted });
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.post(muted ? 'mute' : 'unMute');
  }

  async play(): Promise<void> {
    this.wantPlaying = true;
    this.playIntentAt = Date.now();
    this.post('play');
    this.applyMuteState();
  }

  async pause(): Promise<void> {
    this.wantPlaying = false;
    this.setPlaying(false);
    this.post('pause');
  }

  async seek(seconds: number): Promise<void> {
    this.pendingSeekSeconds = seconds;
    this.currentTimeSeconds = seconds;
    this.seekPostedAt = Date.now();
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
    this.setPlaying(false);
    this.hostElement.replaceChildren();
    this.iframe = null;
    this.readySubject.complete();
    this.isPlayingSubject.complete();
    this.timeUpdatesSubject.complete();
  }

  private mountIframe(options: EmbedOptions): void {
    this.readySubject.next(false);
    this.setPlaying(false);

    const iframe = document.createElement('iframe');
    iframe.title = 'TikTok video';
    // `allow` must be set before `src` or the navigation starts without autoplay.
    iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.addEventListener('load', () => this.onIframeLoad(iframe));

    this.hostElement.replaceChildren(iframe);
    this.iframe = iframe;
    iframe.src = this.buildEmbedUrl(options);
  }

  /**
   * The player API is often not listening yet when the iframe first exists, so
   * replay the pending seek/play as soon as the document has loaded as well.
   */
  private onIframeLoad(iframe: HTMLIFrameElement): void {
    if (this.destroyed || this.iframe !== iframe) {
      return;
    }
    if (this.wantPlaying || this.pendingSeekSeconds != null) {
      this.replayIntent();
    }
  }

  private buildEmbedUrl(options: EmbedOptions): string {
    const params = new URLSearchParams({
      controls: '0',
      progress_bar: '0',
      play_button: '0',
      volume_control: '0',
      fullscreen_button: '0',
      timestamp: '0',
      loop: '0',
      autoplay: options.autoplay ? '1' : '0',
      muted: options.muted || options.autoplay ? '1' : '0',
      music_info: '0',
      description: '0',
      rel: '0',
      closed_caption: '0',
    });

    // If we intend unmuted playback after unlock, still start muted for autoplay
    // policy then unMute via postMessage when ready (unless muted stays true).
    if (options.autoplay && !options.muted) {
      params.set('muted', '1');
    }

    return `https://www.tiktok.com/player/v1/${this.externalVideoId}?${params.toString()}`;
  }

  /**
   * Commands sent before the embed was listening are dropped, so replay them
   * once it reports ready or the iframe document loads. Only play if playback
   * was actually asked for: an unrequested play here spends the autoplay
   * allowance before the user has pressed anything.
   */
  private replayIntent(): void {
    if (this.pendingSeekSeconds != null) {
      this.post('seekTo', this.pendingSeekSeconds);
    }
    this.post(this.wantPlaying ? 'play' : 'pause');
    this.applyMuteState();
  }

  private applyMuteState(): void {
    this.post(this.muted ? 'mute' : 'unMute');
  }

  private post(type: string, value?: unknown): void {
    if (!this.iframe?.contentWindow) {
      return;
    }

    const message: TikTokPlayerMessage =
      value === undefined
        ? { 'x-tiktok-player': true, type }
        : { 'x-tiktok-player': true, type, value };

    this.iframe.contentWindow.postMessage(message, '*');
  }

  private handleMessage(event: MessageEvent<TikTokPlayerMessage>): void {
    if (event.origin !== 'https://www.tiktok.com') {
      return;
    }
    if (this.iframe && event.source !== this.iframe.contentWindow) {
      return;
    }

    const data = event.data;
    if (!data || data['x-tiktok-player'] !== true || !data.type) {
      return;
    }

    switch (data.type) {
      case 'onPlayerReady':
        this.readySubject.next(true);
        this.replayIntent();
        break;
      case 'onStateChange': {
        const state = data.value as number | undefined;
        if (state === 1) {
          this.setPlaying(true);
        } else if (state === 0 || state === 2) {
          this.setPlaying(false);
        }
        if (this.wantPlaying && state === 2 && Date.now() - this.playIntentAt < 2000) {
          this.retryPlay();
        }
        break;
      }
      case 'onPlayerError': {
        const error = data.value as { errorCode?: number; errorType?: string } | undefined;
        if (error?.errorType === 'AUTOPLAY_ERROR' || error?.errorCode === 3002) {
          this.retryPlay();
        }
        break;
      }
      case 'onCurrentTime': {
        const value = data.value as { currentTime?: number; duration?: number } | undefined;
        if (!value) {
          return;
        }
        const nextTime = value.currentTime ?? 0;
        if (this.pendingSeekSeconds != null) {
          const landed = Math.abs(nextTime - this.pendingSeekSeconds) <= 1.25;
          if (!landed && Date.now() - this.seekPostedAt < 1500) {
            return;
          }
          if (landed) {
            this.pendingSeekSeconds = null;
          }
        }
        this.currentTimeSeconds = nextTime;
        this.durationSeconds = value.duration ?? this.durationSeconds;
        break;
      }
      default:
        break;
    }
  }

  private setPlaying(playing: boolean): void {
    if (this.isPlayingSubject.value === playing) {
      return;
    }
    this.isPlayingSubject.next(playing);
  }

  private retryPlay(): void {
    const now = Date.now();
    if (now - this.lastPlayRetryAt < 500) {
      return;
    }
    this.lastPlayRetryAt = now;
    this.post('play');
  }
}
