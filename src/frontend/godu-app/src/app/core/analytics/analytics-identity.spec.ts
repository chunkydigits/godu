import { captureFirstTouchUtm, readOrCreateId } from './analytics-identity';

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();
  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe('analytics identity', () => {
  it('generates and retains an anonymous id', () => {
    const storage = new MemoryStorage();
    const first = readOrCreateId(storage, 'godu_anon_id', () => 'anon-1');
    const second = readOrCreateId(storage, 'godu_anon_id', () => 'anon-2');

    expect(first).toBe('anon-1');
    expect(second).toBe('anon-1');
  });

  it('creates a new id when storage is empty', () => {
    const storage = new MemoryStorage();
    const session = readOrCreateId(storage, 'godu_session_id', () => 'session-1');
    expect(session).toBe('session-1');
    expect(storage.getItem('godu_session_id')).toBe('session-1');
  });

  it('persists first-touch UTM parameters', () => {
    const storage = new MemoryStorage();
    const first = captureFirstTouchUtm(storage, {
      source: 'tiktok',
      medium: 'social',
      campaign: 'ea',
    });
    const later = captureFirstTouchUtm(storage, {
      source: 'other',
      medium: 'cpc',
      campaign: 'later',
    });

    expect(first).toEqual({ utmSource: 'tiktok', utmMedium: 'social', utmCampaign: 'ea' });
    expect(later).toEqual({ utmSource: 'tiktok', utmMedium: 'social', utmCampaign: 'ea' });
  });
});
