/** Shortest useful interval — below this the ticks drown the step. */
export const TIMING_BEEP_SECONDS_MIN = 5;
/** Matches the longest gap/card window. */
export const TIMING_BEEP_SECONDS_MAX = 600;
export const DEFAULT_TIMING_BEEP_SECONDS = 30;

export function normalizeTimingBeepSeconds(
  value: number | null | undefined,
): number | null {
  if (value == null || !Number.isFinite(Number(value))) {
    return null;
  }
  const seconds = Math.floor(Number(value));
  if (seconds < TIMING_BEEP_SECONDS_MIN || seconds > TIMING_BEEP_SECONDS_MAX) {
    return null;
  }
  return seconds;
}

/**
 * Viewer seconds win when set. When the viewer has not chosen an interval,
 * the Godu value is used, then 30 seconds. Off means no ticks.
 */
export function resolveTimingBeepSeconds(options: {
  goduSeconds: number | null | undefined;
  userEnabled: boolean;
  userSeconds: number | null | undefined;
}): number | null {
  if (!options.userEnabled) {
    return null;
  }
  const user = normalizeTimingBeepSeconds(options.userSeconds);
  if (user != null) {
    return user;
  }
  const godu = normalizeTimingBeepSeconds(options.goduSeconds);
  if (godu != null) {
    return godu;
  }
  return DEFAULT_TIMING_BEEP_SECONDS;
}

/**
 * Elapsed-time marks that should beep by `remainingSeconds`, after `lastBeepElapsed`.
 * Skips the start (0) and the timer end (`totalSeconds`).
 */
export function timingBeepMarksDue(
  totalSeconds: number,
  remainingSeconds: number,
  intervalSeconds: number,
  lastBeepElapsed: number,
): number[] {
  if (
    intervalSeconds <= 0 ||
    totalSeconds <= 0 ||
    remainingSeconds <= 0 ||
    remainingSeconds >= totalSeconds
  ) {
    return [];
  }

  const elapsed = totalSeconds - remainingSeconds;
  const marks: number[] = [];
  for (let mark = intervalSeconds; mark <= elapsed && mark < totalSeconds; mark += intervalSeconds) {
    if (mark > lastBeepElapsed) {
      marks.push(mark);
    }
  }
  return marks;
}
