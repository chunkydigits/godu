import { publicViewerPath } from './public-path';
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
}

export interface RecordPlayHistoryRequest {
  goduId: string;
  title: string;
  creatorDisplayName?: string | null;
  playPath: string;
  source: PlayHistorySource;
  event: PlayHistoryEventName;
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
): RecordPlayHistoryRequest {
  return {
    goduId: item.id,
    title: item.title,
    creatorDisplayName: item.creatorDisplayName ?? null,
    playPath: playHistoryPath(item, isDemo),
    source: playHistorySource(item, isDemo),
    event,
  };
}
