import { Injectable } from '@angular/core';

/**
 * iOS/Android installed PWAs often size `100%` / `100vh` to the in-browser
 * viewport, leaving a dead strip at the bottom of the standalone window.
 * Pin the shell to the visual viewport while the app is installed.
 */
@Injectable({ providedIn: 'root' })
export class ViewportHeightService {
  initialize(): void {
    if (typeof window === 'undefined' || !isStandaloneDisplay()) {
      return;
    }

    document.documentElement.classList.add('pwa-standalone');
    const apply = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
    };

    apply();
    window.visualViewport?.addEventListener('resize', apply);
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
  }
}

function isStandaloneDisplay(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}
