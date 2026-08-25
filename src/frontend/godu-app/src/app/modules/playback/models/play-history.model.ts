import { publicViewerPath } from './public-path';
import { sessionStepsSummary, sessionTimeSummary } from './step-entry';
import { StepsItem } from './steps-item.model';
import { StepsVisibility } from './steps-visibility.enum';

export type PlayHistorySource = 'public' | 'library' | 'demo';
export type PlayHistoryEventName = 'started' | 'completed';

export interface PlayHistoryItem {
  goduId: string;
  title: string;
  creatorDisplayName?: string | null;
  playPath: string;
  source: PlayHistorySource;
  startedCount: number;
  completedCount: number;
  lastStartedUtc: string;
  lastCompletedUtc?: string | null;
  lastStepCount?: number | null;
  lastIterationCount?: number | null;
  lastElapsedSeconds?: number | null;
}

export interface RecordPlayHistoryRequest {
  goduId: string;
  title: string;
  creatorDisplayName?: string | null;
  playPath: string;
  source: PlayHistorySource;
  event: PlayHistoryEventName;
  stepCount?: number | null;
  iterationCount?: number | null;
  elapsedSeconds?: number | null;
}

export interface PlayHistorySessionSnapshot {
  stepCount?: number | null;
  iterationCount?: number | null;
  elapsedSeconds?: number | null;
}

export function playHistoryPath(item: StepsItem, isDemo: boolean): string {
  if (isDemo) {
    return `/play/${item.id}`;
  }

  return publicViewerPath(item) ?? `/play/${item.id}`;
}

export function playHistorySource(item: StepsItem, isDemo: boolean): PlayHistorySource {
  if (isDemo) {
    return 'demo';
  }

  if (item.visibility === StepsVisibility.Public || publicViewerPath(item)) {
    return 'public';
  }

  return 'library';
}

export function toRecordPlayHistoryRequest(
  item: StepsItem,
  event: PlayHistoryEventName,
  isDemo: boolean,
  session?: PlayHistorySessionSnapshot | null,
): RecordPlayHistoryRequest {
  return {
    goduId: item.id,
    title: item.title,
    creatorDisplayName: item.creatorDisplayName ?? null,
    playPath: playHistoryPath(item, isDemo),
    source: playHistorySource(item, isDemo),
    event,
    ...(event === 'completed'
      ? {
          stepCount: session?.stepCount ?? undefined,
          iterationCount: session?.iterationCount ?? undefined,
          elapsedSeconds: session?.elapsedSeconds ?? undefined,
        }
      : {}),
  };
}

export function playHistoryStepsSummary(item: PlayHistoryItem): string | null {
  if (item.completedCount <= 0 || item.lastStepCount == null) {
    return null;
  }

  return sessionStepsSummary(item.lastStepCount, item.lastIterationCount ?? 1);
}

export function playHistoryTimeSummary(item: PlayHistoryItem): string | null {
  if (item.completedCount <= 0) {
    return null;
  }

  return sessionTimeSummary(item.lastElapsedSeconds, true);
}
