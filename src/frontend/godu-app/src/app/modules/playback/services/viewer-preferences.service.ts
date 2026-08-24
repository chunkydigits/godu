import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

const VIDEO_KEY = 'steps.viewer.showVideo';
const MUTE_KEY = 'steps.viewer.muted';
const VOICE_CUES_KEY = 'steps.viewer.voiceCues';
const SHOW_ITERATION_KEY = 'steps.viewer.showIteration';

/**
 * Viewer preferences. Video defaults on; mute defaults off.
 */
@Injectable({ providedIn: 'root' })
export class ViewerPreferencesService {
  private readonly showVideoSubject: BehaviorSubject<boolean>;
  private readonly mutedSubject: BehaviorSubject<boolean>;
  private readonly voiceCuesSubject: BehaviorSubject<boolean>;
  private readonly showIterationSubject: BehaviorSubject<boolean>;

  readonly showVideo$: Observable<boolean>;
  readonly muted$: Observable<boolean>;
  readonly voiceCues$: Observable<boolean>;
  readonly showIteration$: Observable<boolean>;

  constructor() {
    this.showVideoSubject = new BehaviorSubject<boolean>(this.readFlag(VIDEO_KEY, true));
    this.mutedSubject = new BehaviorSubject<boolean>(this.readFlag(MUTE_KEY, false));
    this.voiceCuesSubject = new BehaviorSubject<boolean>(this.readFlag(VOICE_CUES_KEY, false));
    this.showIterationSubject = new BehaviorSubject<boolean>(
      this.readFlag(SHOW_ITERATION_KEY, true),
    );
    this.showVideo$ = this.showVideoSubject.asObservable();
    this.muted$ = this.mutedSubject.asObservable();
    this.voiceCues$ = this.voiceCuesSubject.asObservable();
    this.showIteration$ = this.showIterationSubject.asObservable();
  }

  get showVideo(): boolean {
    return this.showVideoSubject.value;
  }

  get muted(): boolean {
    return this.mutedSubject.value;
  }

  get voiceCues(): boolean {
    return this.voiceCuesSubject.value;
  }

  get showIteration(): boolean {
    return this.showIterationSubject.value;
  }

  setShowVideo(show: boolean): void {
    this.showVideoSubject.next(show);
    this.writeFlag(VIDEO_KEY, show);
  }

  setMuted(muted: boolean): void {
    this.mutedSubject.next(muted);
    this.writeFlag(MUTE_KEY, muted);
  }

  setVoiceCues(enabled: boolean): void {
    this.voiceCuesSubject.next(enabled);
    this.writeFlag(VOICE_CUES_KEY, enabled);
  }

  setShowIteration(show: boolean): void {
    this.showIterationSubject.next(show);
    this.writeFlag(SHOW_ITERATION_KEY, show);
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
}
