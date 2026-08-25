/** Whole seconds from a form or input value. Empty / invalid becomes null. */
export function parseSeconds(value: number | string | null | undefined): number | null {
  if (value == null || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.floor(parsed);
}

export function splitSeconds(total: number | null): { minutes: number; seconds: number } {
  const value = total ?? 0;
  return {
    minutes: Math.floor(value / 60),
    seconds: value % 60,
  };
}

export function combineMinutesSeconds(
  minutes: number | null,
  seconds: number | null,
): number {
  return Math.max(0, (minutes ?? 0) * 60 + (seconds ?? 0));
}

/**
 * Live countdown: a plain second count up to a minute, then m:ss.
 * 60 stays "60"; 61 becomes "1:01".
 */
export function formatCountdown(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) {
    return '';
  }
  const seconds = Math.max(0, Math.floor(totalSeconds));
  if (seconds <= 60) {
    return String(seconds);
  }
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

export function countdownUsesMinutes(totalSeconds: number | null | undefined): boolean {
  return totalSeconds != null && Number.isFinite(totalSeconds) && totalSeconds > 60;
}
