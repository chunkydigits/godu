import { environment } from '../../../../environments/environment';

/** ~160 words/minute, used to start long “Go” phrases so they land at timer start. */
const WORDS_PER_SECOND = 2.6;
const SPEECH_WATCH_MS = 4000;

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
 * iOS Safari ignores speak() unless TTS was primed in the same tap as Start;
 * later steps then work without a gesture.
 */
export class PlaybackVoiceCues {
  enabled = false;
  private audioContext: AudioContext | null = null;
  private timedGoStarted = false;
  private pendingText: string | null = null;
  private speakTimer: ReturnType<typeof setTimeout> | null = null;
  private speechWatch: ReturnType<typeof setInterval> | null = null;
  private voicesListenerAttached = false;

  unlockFromUserGesture(): void {
    if (!this.enabled || typeof window === 'undefined') {
      return;
    }
    this.primeAudioFromGesture();
    this.primeSpeechFromGesture();
    this.ensureVoicesListener();
  }

  cancel(): void {
    this.timedGoStarted = false;
    this.pendingText = null;
    if (this.speakTimer != null) {
      clearTimeout(this.speakTimer);
      this.speakTimer = null;
    }
    this.stopSpeechWatch();
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
  }

  announceGapStart(title: string, durationSeconds: number | null | undefined): void {
    if (!this.enabled) {
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
    if (!this.enabled || this.timedGoStarted) {
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
    if (!this.enabled) {
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
    this.pendingText = text.trim();
    this.ensureVoicesListener();
    this.queueSpeechFlush();
  }

  private queueSpeechFlush(): void {
    if (this.speakTimer != null) {
      clearTimeout(this.speakTimer);
    }
    // iOS drops speak() when it runs in the same turn as cancel().
    this.speakTimer = setTimeout(() => {
      this.speakTimer = null;
      this.flushSpeech();
    }, 50);
  }

  private flushSpeech(): void {
    const text = this.pendingText;
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    if (!text || !synth) {
      return;
    }

    try {
      synth.cancel();
      if (synth.paused) {
        synth.resume();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.lang = preferredSpeechLang();
      const voice = pickEnglishVoice(synth.getVoices());
      if (voice) {
        utterance.voice = voice;
      }
      utterance.onend = () => {
        if (this.pendingText === text) {
          this.pendingText = null;
        }
      };
      synth.speak(utterance);
      this.startSpeechWatch();
    } catch {
      // jsdom / restricted contexts
    }
  }

  private primeSpeechFromGesture(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }
    try {
      window.speechSynthesis.getVoices();
      const primer = new SpeechSynthesisUtterance(' ');
      primer.volume = 0.01;
      primer.rate = 2;
      primer.lang = preferredSpeechLang();
      window.speechSynthesis.speak(primer);
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      // ignore
    }
  }

  private primeAudioFromGesture(): void {
    const context = this.ensureAudioContext();
    if (!context) {
      return;
    }
    try {
      if (context.state === 'suspended') {
        void context.resume();
      }
      const buffer = context.createBuffer(1, 1, context.sampleRate);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(0);
    } catch {
      // AudioContext not fully available
    }
  }

  private ensureVoicesListener(): void {
    if (this.voicesListenerAttached || typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }
    this.voicesListenerAttached = true;
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      if (this.pendingText) {
        this.queueSpeechFlush();
      }
    });
  }

  private startSpeechWatch(): void {
    if (this.speechWatch != null || typeof window === 'undefined') {
      return;
    }
    this.speechWatch = setInterval(() => {
      const synth = window.speechSynthesis;
      if (!synth?.speaking) {
        return;
      }
      if (synth.paused) {
        synth.resume();
      }
    }, SPEECH_WATCH_MS);
  }

  private stopSpeechWatch(): void {
    if (this.speechWatch == null) {
      return;
    }
    clearInterval(this.speechWatch);
    this.speechWatch = null;
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

function preferredSpeechLang(): string {
  const lang = typeof navigator !== 'undefined' ? navigator.language : '';
  return lang?.trim() || 'en-GB';
}

function pickEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  if (!voices.length) {
    return undefined;
  }
  const lang = preferredSpeechLang().toLowerCase();
  return (
    voices.find((voice) => voice.lang.toLowerCase() === lang) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(lang.slice(0, 2))) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ??
    voices[0]
  );
}
