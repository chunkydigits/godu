import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { ScreenWakeLockService } from './screen-wake-lock.service';

describe('ScreenWakeLockService', () => {
  let service: ScreenWakeLockService;
  let releaseFn: ReturnType<typeof vi.fn>;
  let requestFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    releaseFn = vi.fn().mockResolvedValue(undefined);
    requestFn = vi.fn().mockResolvedValue({
      released: false,
      release: releaseFn,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      type: 'screen',
      onrelease: null,
      dispatchedEvent: vi.fn(),
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

  it('fails soft when request rejects', async () => {
    requestFn.mockRejectedValueOnce(new Error('denied'));
    await service.request();
    expect(service.isActive).toBe(false);
  });
});
