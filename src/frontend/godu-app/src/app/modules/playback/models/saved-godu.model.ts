import { playHistoryPath } from './play-history.model';
import { StepsItem } from './steps-item.model';
import { StepsVisibility } from './steps-visibility.enum';
import { GoduPlaybackSettings } from './godu-playback-settings';

export interface SavedGoduItem {
  goduId: string;
  title: string;
  creatorDisplayName?: string | null;
  playPath: string;
  category?: string | null;
  savedUtc: string;
  userSettings?: GoduPlaybackSettings | null;
}

export interface SaveGoduRequest {
  goduId: string;
  title: string;
  creatorDisplayName?: string | null;
  playPath: string;
  category?: string | null;
}

export function canSaveGodu(options: {
  authenticated: boolean;
  alreadySaved: boolean;
  isDemo: boolean;
  visibility: string | null | undefined;
}): boolean {
  if (!options.authenticated || options.alreadySaved) {
    return false;
  }

  if (options.isDemo) {
    return true;
  }

  return (options.visibility ?? '').toLowerCase() === StepsVisibility.Public;
}

export function toSaveGoduRequest(
  item: StepsItem,
  isDemo: boolean,
  category?: string | null,
): SaveGoduRequest {
  return {
    goduId: item.id,
    title: item.title,
    creatorDisplayName: item.creatorDisplayName ?? null,
    playPath: playHistoryPath(item, isDemo),
    category: category || null,
  };
}
