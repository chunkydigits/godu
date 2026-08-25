import { parseSeconds } from './duration';
import { EditorEntryValue } from './editor-entry-request';
import { StepDefinition } from './step-definition.model';
import {
  DEFAULT_CARD_BACKGROUND,
  DEFAULT_CARD_SECONDS,
  DEFAULT_CARD_TEXT,
  DEFAULT_GAP_SECONDS,
  isCardEntry,
  stepEntryKind,
} from './step-entry';

export interface EditorCardPreview {
  card: StepDefinition | null;
  remainingSeconds: number | null;
  upNext: boolean;
  gapMessage: string | null;
  gapSeconds: number | null;
}

export function buildEditorCardPreview(
  entries: readonly EditorEntryValue[],
  selectedIndex: number,
): EditorCardPreview | null {
  if (entries.length === 0) {
    return null;
  }
  const index = Math.min(Math.max(0, selectedIndex), entries.length - 1);
  const selected = entries[index];
  const kind = stepEntryKind(selected);

  if (kind === 'step') {
    return null;
  }

  if (kind === 'card') {
    const card = toPreviewCard(selected, index + 1);
    return {
      card,
      remainingSeconds: card.durationSeconds ?? null,
      upNext: false,
      gapMessage: null,
      gapSeconds: null,
    };
  }

  const next = nextActivity(entries, index);
  const card = next && isCardEntry(next) ? toPreviewCard(next, index + 2) : null;
  const gapSeconds = parseSeconds(selected.durationSeconds) ?? DEFAULT_GAP_SECONDS;
  const gapMessage = selected.message?.trim() || null;
  if (!card && !gapMessage && gapSeconds <= 0) {
    return null;
  }
  return {
    card,
    remainingSeconds: null,
    upNext: !!card,
    gapMessage,
    gapSeconds,
  };
}

function nextActivity(
  entries: readonly EditorEntryValue[],
  fromIndex: number,
): EditorEntryValue | null {
  for (let i = fromIndex + 1; i < entries.length; i += 1) {
    if (stepEntryKind(entries[i]) !== 'gap') {
      return entries[i];
    }
  }
  return null;
}

function toPreviewCard(entry: EditorEntryValue, order: number): StepDefinition {
  return {
    id: entry.id || 'preview',
    order,
    kind: 'card',
    title: '',
    startSeconds: 0,
    endSeconds: 0,
    durationSeconds: parseSeconds(entry.durationSeconds) ?? DEFAULT_CARD_SECONDS,
    autoAdvance: true,
    message: entry.message?.trim() || null,
    backgroundColor: entry.backgroundColor?.trim() || DEFAULT_CARD_BACKGROUND,
    textColor: entry.textColor?.trim() || DEFAULT_CARD_TEXT,
  };
}
