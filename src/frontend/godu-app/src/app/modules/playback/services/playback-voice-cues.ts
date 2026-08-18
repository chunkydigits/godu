import { environment } from '../../../../environments/environment';

/** ~160 words/minute, used to start long “Go” phrases so they land at timer start. */
const WORDS_PER_SECOND = 2.6;

export function voiceCuesEnabled(): boolean {
  return environment.playback.voiceCues !== false;
}

export function gapGoCueMaxSeconds(): number {
  const value = environment.playback.gapGoCueMaxSeconds;
  if (!Number.isFinite(value) || value < 0) {
    return 10;
  }
  return Math.floor(value);
}

export function formatDurationClause(
  durationSeconds: number | null | undefined,
): string {
  if (durationSeconds == null || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return '';
  }
  const n = Math.round(durationSeconds);
  return n === 1 ? 'for 1 second' : `for ${n} seconds`;
}

export function formatStepAnnouncement(
  title: string,
  durationSeconds: number | null | undefined,
): string {
  const name = title.trim() || 'this step';
  const duration = formatDurationClause(durationSeconds);
  return duration ? `${name} ${duration}` : name;
}

export function formatNextUpAnnouncement(
  title: string,
  durationSeconds: number | null | undefined,
): string {
  return `Next up ${formatStepAnnouncement(title, durationSeconds)}`;
}

export function formatTimerStartAnnouncement(
  title: string,
  durationSeconds: number | null | undefined,
  fromGapSeconds: number | null,
): string {
  if (fromGapSeconds != null && fromGapSeconds > 0) {
    if (fromGapSeconds < gapGoCueMaxSeconds()) {
      return 'Go';
    }
    return `${formatStepAnnouncement(title, durationSeconds)}, Go`;
  }
  return formatStepAnnouncement(title, durationSeconds);
}

export function estimateSpeechSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(12, Math.max(0.7, words / WORDS_PER_SECOND));
}

/**
 * Beeps and spoken step cues. Uses Web Audio + speechSynthesis.
 * Unlock from a user gesture (Start) so browsers allow sound.
 */
export class PlaybackVoiceCues {
  private audioContext: AudioContext | null = null;
  private timedGoStarted = false;

  unlockFromUserGesture(): void {
    if (!voiceCuesEnabled() || typeof window === 'undefined') {
      return;
    }
    const context = this.ensureAudioContext();
    if (context?.state === 'suspended') {
      void context.resume();
    }
  }

  cancel(): void {
    this.timedGoStarted = false;
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
  }

  announceGapStart(title: string, durationSeconds: number | null | undefined): void {
    if (!voiceCuesEnabled()) {
      return;
    }
    this.timedGoStarted = false;
    this.speak(formatNextUpAnnouncement(title, durationSeconds));
  }

  /**
   * For long gaps, start “Title for N seconds, Go” so “Go” lands near the activity timer.
   */
  maybeScheduleTimedGo(
    title: string,
    durationSeconds: number | null | undefined,
    remainingSeconds: number,
    gapTotalSeconds: number,
  ): void {
    if (!voiceCuesEnabled() || this.timedGoStarted) {
      return;
    }
    if (gapTotalSeconds < gapGoCueMaxSeconds()) {
      return;
    }
    const phrase = formatTimerStartAnnouncement(title, durationSeconds, gapTotalSeconds);
    if (remainingSeconds <= Math.ceil(estimateSpeechSeconds(phrase))) {
      this.timedGoStarted = true;
      this.speak(phrase);
    }
  }

  announceActivityStart(
    title: string,
    durationSeconds: number | null | undefined,
    fromGapSeconds: number | null,
  ): void {
    if (!voiceCuesEnabled()) {
      return;
    }
    this.beep();
    if (this.timedGoStarted) {
      this.timedGoStarted = false;
      return;
    }
    this.speak(formatTimerStartAnnouncement(title, durationSeconds, fromGapSeconds));
  }

  private speak(text: string): void {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text.trim()) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch {
      // jsdom / restricted contexts
    }
  }

  private beep(): void {
    const context = this.ensureAudioContext();
    if (!context) {
      return;
    }
    try {
      if (context.state === 'suspended') {
        void context.resume();
      }

      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.16);
    } catch {
      // AudioContext not fully available
    }
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      return null;
    }
    if (!this.audioContext) {
      try {
        this.audioContext = new Ctor();
      } catch {
        return null;
      }
    }
    return this.audioContext;
  }
}
