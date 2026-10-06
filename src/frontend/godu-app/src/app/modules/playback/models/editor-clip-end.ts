import { formatPreciseTimestamp } from './duration';

export function clampEndSecondsToVideo(
  endSeconds: number,
  videoDurationSeconds: number | null | undefined,
): { endSeconds: number; clamped: boolean } {
  if (
    videoDurationSeconds == null ||
    !Number.isFinite(videoDurationSeconds) ||
    videoDurationSeconds <= 0 ||
    !Number.isFinite(endSeconds) ||
    endSeconds <= videoDurationSeconds
  ) {
    return { endSeconds, clamped: false };
  }

  return { endSeconds: videoDurationSeconds, clamped: true };
}

export function videoEndAdjustedMessage(videoDurationSeconds: number): string {
  return `The video ends at ${formatPreciseTimestamp(videoDurationSeconds)} so the end time has been automatically adjusted.`;
}
