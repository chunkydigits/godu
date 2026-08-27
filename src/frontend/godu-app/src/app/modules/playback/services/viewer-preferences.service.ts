import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

const VIDEO_KEY = 'steps.viewer.showVideo';
const MUTE_KEY = 'steps.viewer.muted';
const CLIP_AUDIO_KEY = 'steps.viewer.clipAudio';
const VOICE_CUES_KEY = 'steps.viewer.voiceCues';
const SHOW_ITERATION_KEY = 'steps.viewer.showIteration';
const TIMING_BEEPS_KEY = 'steps.viewer.timingBeeps';
const TIMING_BEEP_SECONDS_KEY = 'steps.viewer.timingBeepSeconds';

/**
 * Viewer preferences. Video defaults on; mute defaults off.
 */
@Injectable({ providedIn: 'root' })
export class ViewerPreferencesService {
  private readonly showVideoSubject: BehaviorSubject<boolean>;
  private readonly mutedSubject: BehaviorSubject<boolean>;
  private readonly clipAudioSubject: BehaviorSubject<boolean>;
  private readonly voiceCuesSubject: BehaviorSubject<boolean>;
  private readonly showIterationSubject: BehaviorSubject<boolean>;
  private readonly timingBeepsSubject: BehaviorSubject<boolean>;
  private readonly timingBeepSecondsSubject: BehaviorSubject<number | null>;

  readonly showVideo$: Observable<boolean>;
  readonly muted$: Observable<boolean>;
  readonly clipAudio$: Observable<boolean>;
  readonly voiceCues$: Observable<boolean>;
  readonly showIteration$: Observable<boolean>;
  readonly timingBeeps$: Observable<boolean>;
  readonly timingBeepSeconds$: Observable<number | null>;

  constructor() {
    this.showVideoSubject = new BehaviorSubject<boolean>(this.readFlag(VIDEO_KEY, true));
    this.mutedSubject = new BehaviorSubject<boolean>(this.readFlag(MUTE_KEY, false));
    this.clipAudioSubject = new BehaviorSubject<boolean>(this.readFlag(CLIP_AUDIO_KEY, true));
    this.voiceCuesSubject = new BehaviorSubject<boolean>(this.readFlag(VOICE_CUES_KEY, false));
    this.showIterationSubject = new BehaviorSubject<boolean>(
      this.readFlag(SHOW_ITERATION_KEY, true),
    );
    this.timingBeepsSubject = new BehaviorSubject<boolean>(this.readFlag(TIMING_BEEPS_KEY, true));
    this.timingBeepSecondsSubject = new BehaviorSubject<number | null>(
      this.readNumber(TIMING_BEEP_SECONDS_KEY),
    );
    this.showVideo$ = this.showVideoSubject.asObservable();
    this.muted$ = this.mutedSubject.asObservable();
    this.clipAudio$ = this.clipAudioSubject.asObservable();
    this.voiceCues$ = this.voiceCuesSubject.asObservable();
    this.showIteration$ = this.showIterationSubject.asObservable();
    this.timingBeeps$ = this.timingBeepsSubject.asObservable();
    this.timingBeepSeconds$ = this.timingBeepSecondsSubject.asObservable();
  }

  get showVideo(): boolean {
    return this.showVideoSubject.value;
  }

  get muted(): boolean {
    return this.mutedSubject.value;
  }

  get clipAudio(): boolean {
    return this.clipAudioSubject.value;
  }

  get voiceCues(): boolean {
    return this.voiceCuesSubject.value;
  }

  get showIteration(): boolean {
    return this.showIterationSubject.value;
  }

  get timingBeeps(): boolean {
    return this.timingBeepsSubject.value;
  }

  /** Null means follow the Godu interval, then the 30 second default. */
  get timingBeepSeconds(): number | null {
    return this.timingBeepSecondsSubject.value;
  }

  setShowVideo(show: boolean): void {
    this.showVideoSubject.next(show);
    this.writeFlag(VIDEO_KEY, show);
  }

  setMuted(muted: boolean): void {
    this.mutedSubject.next(muted);
    this.writeFlag(MUTE_KEY, muted);
  }

  setClipAudio(enabled: boolean): void {
    this.clipAudioSubject.next(enabled);
    this.writeFlag(CLIP_AUDIO_KEY, enabled);
  }

  setVoiceCues(enabled: boolean): void {
    this.voiceCuesSubject.next(enabled);
    this.writeFlag(VOICE_CUES_KEY, enabled);
  }

  setShowIteration(show: boolean): void {
    this.showIterationSubject.next(show);
    this.writeFlag(SHOW_ITERATION_KEY, show);
  }

  setTimingBeeps(enabled: boolean): void {
    this.timingBeepsSubject.next(enabled);
    this.writeFlag(TIMING_BEEPS_KEY, enabled);
  }

  setTimingBeepSeconds(seconds: number | null): void {
    this.timingBeepSecondsSubject.next(seconds);
    this.writeNumber(TIMING_BEEP_SECONDS_KEY, seconds);
  }

  toggleShowVideo(): void {
    this.setShowVideo(!this.showVideo);
  }

  toggleMuted(): void {
    this.setMuted(!this.muted);
  }

  private readFlag(key: string, defaultValue: boolean): boolean {
    try {
      const raw = localStorage.getItem(key);
      if (raw === '0') {
        return false;
      }
      if (raw === '1') {
        return true;
      }
    } catch {
      // ignore
    }
    return defaultValue;
  }

  private writeFlag(key: string, value: boolean): void {
    try {
      localStorage.setItem(key, value ? '1' : '0');
    } catch {
      // private mode / blocked storage — in-memory still works
    }
  }

  private readNumber(key: string): number | null {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null || raw === '') {
        return null;
      }
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
      }
      return Math.floor(parsed);
    } catch {
      return null;
    }
  }

  private writeNumber(key: string, value: number | null): void {
    try {
      if (value == null) {
        localStorage.removeItem(key);
        return;
      }
      localStorage.setItem(key, String(value));
    } catch {
      // private mode / blocked storage — in-memory still works
    }
  }
}
