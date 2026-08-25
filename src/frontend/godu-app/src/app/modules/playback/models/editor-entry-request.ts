import { ApiStepDefinitionRequest } from './api-steps-item.model';
import {
  DEFAULT_CARD_BACKGROUND,
  DEFAULT_CARD_TEXT,
  normaliseCardColour,
  normaliseGapMessage,
  normaliseGapSeconds,
  stepEntryKind,
} from './step-entry';

/** Raw value of one entry in the steps editor form array. */
export interface EditorEntryValue {
  id?: string;
  order?: number;
  kind?: string;
  title?: string;
  description?: string;
  startSeconds?: number | string;
  endSeconds?: number | string;
  durationSeconds?: number | string | null;
  autoAdvance?: boolean;
  loopVideo?: boolean;
  message?: string;
  backgroundColor?: string;
  textColor?: string;
  stillSeconds?: number | string | null;
  useStill?: boolean;
}

export function mapEditorEntryToApiStep(
  entry: EditorEntryValue,
  index: number,
  useVideo: boolean,
): ApiStepDefinitionRequest | null {
  const order = index + 1;
  const kind = stepEntryKind(entry);

  if (kind === 'gap') {
    return {
      id: entry.id || null,
      order,
      kind: 'gap',
      title: null,
      description: null,
      startSeconds: 0,
      endSeconds: 0,
      durationSeconds: normaliseGapSeconds(Number(entry.durationSeconds)),
      autoAdvance: true,
      message: normaliseGapMessage(entry.message),
    };
  }

  if (kind === 'card') {
    const stillValue = Number(entry.stillSeconds);
    const still =
      useVideo &&
      entry.useStill &&
      Number.isFinite(stillValue) &&
      stillValue >= 0
        ? stillValue
        : null;
    return {
      id: entry.id || null,
      order,
      kind: 'card',
      title: null,
      description: null,
      startSeconds: 0,
      endSeconds: 0,
      durationSeconds: normaliseGapSeconds(Number(entry.durationSeconds)),
      autoAdvance: true,
      message: normaliseGapMessage(entry.message),
      backgroundColor: normaliseCardColour(entry.backgroundColor, DEFAULT_CARD_BACKGROUND),
      textColor: normaliseCardColour(entry.textColor, DEFAULT_CARD_TEXT),
      stillSeconds: still,
    };
  }

  if (!useVideo) {
    return null;
  }

  const duration =
    entry.durationSeconds === null || entry.durationSeconds === ''
      ? null
      : Number(entry.durationSeconds);

  return {
    id: entry.id || null,
    order,
    kind: 'step',
    title: entry.title?.trim() ?? '',
    description: entry.description?.trim() || null,
    startSeconds: Number(entry.startSeconds),
    endSeconds: Number(entry.endSeconds),
    durationSeconds:
      duration != null && Number.isFinite(duration) && duration > 0 ? duration : null,
    autoAdvance: !!entry.autoAdvance,
    loopVideo: entry.loopVideo !== false,
    message: null,
  };
}
