import { Observable } from 'rxjs';

export interface VideoPlayer {
  initialise(): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(seconds: number): Promise<void>;
  getCurrentTime(): Promise<number>;
  destroy(): Promise<void>;
}

export interface VideoPlayerTimeUpdate {
  currentTime: number;
  duration: number;
}

export interface ControllableVideoPlayer extends VideoPlayer {
  readonly timeUpdates: Observable<VideoPlayerTimeUpdate>;
  readonly ready: Observable<boolean>;

  /**
   * Begin media from a user gesture. Must run synchronously in the click stack
   * (no await before calling) so the browser/embed can unlock playback.
   */
  kickstartFromUserGesture(startSeconds: number): void;
}
