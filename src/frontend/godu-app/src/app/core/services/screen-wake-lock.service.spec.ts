import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { ScreenWakeLockService } from './screen-wake-lock.service';

describe('ScreenWakeLockService', () => {
  let service: ScreenWakeLockService;
  let releaseFn: ReturnType<typeof vi.fn>;
  let requestFn: ReturnType<typeof vi.fn>;
  let sentinel: {
    released: boolean;
    release: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
    type: string;
    onrelease: null;
  };

  beforeEach(() => {
    releaseFn = vi.fn().mockResolvedValue(undefined);
    sentinel = {
      released: false,
      release: releaseFn,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      type: 'screen',
      onrelease: null,
    };
    requestFn = vi.fn().mockImplementation(async () => {
      sentinel.released = false;
      return sentinel;
    });

    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: requestFn },
    });

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });

    service = new ScreenWakeLockService();
  });

  afterEach(async () => {
    await service.release();
    service.ngOnDestroy();
    vi.restoreAllMocks();
  });

  it('requests a screen wake lock', async () => {
    await service.request();
    expect(requestFn).toHaveBeenCalledWith('screen');
    expect(service.isActive).toBe(true);
  });

  it('releases the wake lock', async () => {
    await service.request();
    await service.release();
    expect(releaseFn).toHaveBeenCalled();
    expect(service.isActive).toBe(false);
  });

  it('re-requests when Safari marks the previous lock released', async () => {
    await service.request();
    sentinel.released = true;

    await service.request();

    expect(requestFn).toHaveBeenCalledTimes(2);
  });

  it('re-requests on pageshow while still wanted', async () => {
    await service.request();
    sentinel.released = true;
    requestFn.mockClear();

    window.dispatchEvent(new Event('pageshow'));
    await vi.waitFor(() => {
      expect(requestFn).toHaveBeenCalledWith('screen');
    });
  });

  it('fails soft when request rejects', async () => {
    requestFn.mockRejectedValueOnce(new Error('denied'));
    await service.request();
    expect(service.isActive).toBe(false);
  });
});
