import { PlayHistoryItem, RecordPlayHistoryRequest } from './play-history.model';
import { browserStorage } from '../../../core/analytics/analytics-identity';

export const GODU_PLAY_HISTORY_KEY = 'godu_play_history';
const LOCAL_CAP = 100;

export function loadLocalPlayHistory(): PlayHistoryItem[] {
  const raw = browserStorage('local')?.getItem(GODU_PLAY_HISTORY_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as PlayHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalPlayHistory(items: PlayHistoryItem[]): void {
  browserStorage('local')?.setItem(GODU_PLAY_HISTORY_KEY, JSON.stringify(items.slice(0, LOCAL_CAP)));
}

export function removeLocalPlayHistory(goduId: string): void {
  saveLocalPlayHistory(loadLocalPlayHistory().filter((item) => item.goduId !== goduId));
}

export function upsertLocalPlayHistory(request: RecordPlayHistoryRequest, nowIso: string): PlayHistoryItem[] {
  const items = loadLocalPlayHistory();
  const existing = items.find((item) => item.goduId === request.goduId);
  const next: PlayHistoryItem = existing
    ? { ...existing }
    : {
        goduId: request.goduId,
        title: request.title,
        creatorDisplayName: request.creatorDisplayName,
        playPath: request.playPath,
        source: request.source,
        startedCount: 0,
        completedCount: 0,
        lastStartedUtc: nowIso,
      };

  next.title = request.title;
  next.creatorDisplayName = request.creatorDisplayName ?? next.creatorDisplayName;
  next.playPath = request.playPath;
  next.source = request.source;

  if (request.event === 'completed') {
    if (!existing) {
      next.startedCount = 1;
      next.lastStartedUtc = nowIso;
    }
    next.completedCount += 1;
    next.lastCompletedUtc = nowIso;
  } else {
    next.startedCount += 1;
    next.lastStartedUtc = nowIso;
  }

  const others = items.filter((item) => item.goduId !== request.goduId);
  const ranked = [next, ...others].sort((a, b) => b.lastStartedUtc.localeCompare(a.lastStartedUtc));
  saveLocalPlayHistory(ranked);
  return ranked;
}
