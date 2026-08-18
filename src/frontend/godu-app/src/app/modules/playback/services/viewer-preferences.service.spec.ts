import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { ViewerPreferencesService } from './viewer-preferences.service';

describe('ViewerPreferencesService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('defaults to video on and unmuted', () => {
    const service = new ViewerPreferencesService();
    expect(service.showVideo).toBe(true);
    expect(service.muted).toBe(false);
    expect(service.voiceCues).toBe(false);
  });

  it('persists video off preference', () => {
    const service = new ViewerPreferencesService();
    service.setShowVideo(false);
    expect(localStorage.getItem('steps.viewer.showVideo')).toBe('0');

    const again = new ViewerPreferencesService();
    expect(again.showVideo).toBe(false);
  });

  it('persists mute preference', () => {
    const service = new ViewerPreferencesService();
    service.setMuted(true);
    expect(localStorage.getItem('steps.viewer.muted')).toBe('1');

    const again = new ViewerPreferencesService();
    expect(again.muted).toBe(true);
  });

  it('persists voice cues preference', () => {
    const service = new ViewerPreferencesService();
    service.setVoiceCues(true);
    expect(localStorage.getItem('steps.viewer.voiceCues')).toBe('1');

    const again = new ViewerPreferencesService();
    expect(again.voiceCues).toBe(true);
  });

  it('toggles show video', () => {
    const service = new ViewerPreferencesService();
    service.toggleShowVideo();
    expect(service.showVideo).toBe(false);
  });
});
