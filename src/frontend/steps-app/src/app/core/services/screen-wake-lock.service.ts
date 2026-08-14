import { Injectable, OnDestroy } from '@angular/core';

/**
 * Keeps the screen awake while a Steps session is actively playing.
 * Uses the Screen Wake Lock API when available; fails soft otherwise.
 */
@Injectable({ providedIn: 'root' })
export class ScreenWakeLockService implements OnDestroy {
  private sentinel: WakeLockSentinel | null = null;
  private wanted = false;
  private readonly onVisibilityChange = () => {
    if (document.visibilityState === 'visible' && this.wanted) {
      void this.request();
    }
  };

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    void this.release();
  }

  async request(): Promise<void> {
    this.wanted = true;

    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    if (document.visibilityState !== 'visible') {
      return;
    }

    try {
      if (this.sentinel) {
        return;
      }
      this.sentinel = await navigator.wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
      });
    } catch {
      // Permission denied / unsupported document state — fail soft
      this.sentinel = null;
    }
  }

  async release(): Promise<void> {
    this.wanted = false;
    const current = this.sentinel;
    this.sentinel = null;
    if (!current) {
      return;
    }
    try {
      await current.release();
    } catch {
      // ignore
    }
  }

  get isActive(): boolean {
    return this.sentinel != null && this.sentinel.released === false;
  }
}
