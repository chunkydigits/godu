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

/**
 * Compact length for collapsed editor titles: seconds below a minute, then m and s.
 * 45 → "45s", 60 → "1m", 90 → "1m 30s", 900 → "15m".
 */
export function formatCompactDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '—';
  }
  const seconds = Math.floor(totalSeconds);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`;
}

/**
 * Spoken length for voice cues: seconds below a minute, then minutes and seconds.
 * 45 → "45 seconds", 60 → "1 minute", 90 → "1 minute and 30 seconds".
 */
export function formatSpokenDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '';
  }
  const seconds = Math.round(totalSeconds);
  if (seconds < 60) {
    return seconds === 1 ? '1 second' : `${seconds} seconds`;
  }
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  const minutePart = minutes === 1 ? '1 minute' : `${minutes} minutes`;
  if (rest === 0) {
    return minutePart;
  }
  const secondPart = rest === 1 ? '1 second' : `${rest} seconds`;
  return `${minutePart} and ${secondPart}`;
}

/** Elapsed share of a countdown, 0 at the start and 100 when remaining hits 0. */
export function countdownProgress(
  remainingSeconds: number | null | undefined,
  totalSeconds: number | null | undefined,
): number {
  if (
    remainingSeconds == null ||
    totalSeconds == null ||
    !Number.isFinite(remainingSeconds) ||
    !Number.isFinite(totalSeconds) ||
    totalSeconds <= 0
  ) {
    return 0;
  }
  const remaining = Math.max(0, remainingSeconds);
  const elapsed = Math.min(totalSeconds, Math.max(0, totalSeconds - remaining));
  return (elapsed / totalSeconds) * 100;
}
