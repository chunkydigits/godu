import { Injectable, OnDestroy } from '@angular/core';

/**
 * Keeps the screen awake while a Godu session is actively playing.
 * Uses the Screen Wake Lock API when available; fails soft otherwise.
 *
 * Safari only grants the lock from a user gesture and may mark it released
 * without a reliable event — re-request from Start/Resume and on pageshow.
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
  private readonly onPageShow = () => {
    if (this.wanted) {
      void this.request();
    }
  };

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pageshow', this.onPageShow);
    }
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pageshow', this.onPageShow);
    }
    void this.release();
  }

  async request(): Promise<void> {
    this.wanted = true;

    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }

    try {
      if (this.sentinel && this.sentinel.released === false) {
        return;
      }
      this.sentinel = null;
      this.sentinel = await navigator.wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
      });
    } catch {
      // Permission denied / lost user activation / unsupported — fail soft
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
