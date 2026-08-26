import { publicViewerPath } from './public-path';
import { SaveGoduRequest, toSaveGoduRequest } from './saved-godu.model';
import { DemoStepsItem } from './demo-steps-item.model';

export interface AssociatedPublicGodu {
  id: string;
  title: string;
  slug?: string | null;
  provider?: string | null;
  username?: string | null;
  publicPath?: string | null;
  creatorDisplayName?: string | null;
}

export interface AssociatedGoduImportPlan {
  found: number;
  toImport: SaveGoduRequest[];
}

export function normaliseTikTokHandle(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/^@/, '').toLowerCase();
}

export function tiktokHandlesForAccount(account: {
  username: string;
  usernameAliases?: string[] | null;
}): string[] {
  const handles = [account.username, ...(account.usernameAliases ?? [])]
    .map(normaliseTikTokHandle)
    .filter(Boolean);
  return [...new Set(handles)];
}

export function planAssociatedGoduImport(options: {
  handles: readonly string[];
  published: readonly AssociatedPublicGodu[];
  demos: readonly DemoStepsItem[];
  alreadySavedIds: ReadonlySet<string>;
  creatorDisplayName?: string | null;
}): AssociatedGoduImportPlan {
  const handleSet = new Set(options.handles.map(normaliseTikTokHandle).filter(Boolean));
  const byId = new Map<string, SaveGoduRequest>();

  for (const demo of options.demos) {
    const username = normaliseTikTokHandle(demo.video.creatorUsername);
    if (!username || !handleSet.has(username)) {
      continue;
    }

    byId.set(demo.id, toSaveGoduRequest(demo, true, demo.category));
  }

  for (const item of options.published) {
    if (byId.has(item.id)) {
      continue;
    }

    byId.set(item.id, {
      goduId: item.id,
      title: item.title,
      creatorDisplayName:
        item.creatorDisplayName ?? options.creatorDisplayName ?? (item.username ? `@${item.username}` : null),
      playPath: publicViewerPath(item) ?? `/play/${item.id}`,
      category: null,
    });
  }

  const candidates = [...byId.values()];
  return {
    found: candidates.length,
    toImport: candidates.filter((item) => !options.alreadySavedIds.has(item.goduId)),
  };
}

export function associatedGoduImportMessage(
  username: string,
  found: number,
  imported: number,
): string {
  const handle = username.startsWith('@') ? username : `@${username}`;
  if (found === 0) {
    return `No public Godus found for ${handle}.`;
  }

  const skipped = found - imported;
  if (imported === 0) {
    return `All ${found} Godus for ${handle} are already in Saved.`;
  }

  const importedLabel = imported === 1 ? '1 Godu' : `${imported} Godus`;
  if (skipped <= 0) {
    return `Imported ${importedLabel} into Saved.`;
  }

  return `Imported ${importedLabel} into Saved. ${skipped} already there.`;
}
