/**
 * A Steps item is an ordered list of entries. Most are activity steps, but an
 * entry can also be a gap (a rest that counts down before the next activity).
 * New kinds only need a `StepEntryKind` member, a catalogue entry, and handling
 * in the editor template and playback transition resolver.
 */
export type StepEntryKind = 'step' | 'gap';

export interface StepEntryKindOption {
  kind: StepEntryKind;
  label: string;
  hint: string;
  icon: string;
}

/** Drives the "Add step" menu in the editor; order is the menu order. */
export const STEP_ENTRY_KINDS: readonly StepEntryKindOption[] = [
  {
    kind: 'step',
    label: 'Step',
    hint: 'A clip from the video with its own timing',
    icon: 'play_circle',
  },
  {
    kind: 'gap',
    label: 'Gap',
    hint: 'A rest that counts down before the next step',
    icon: 'hourglass_empty',
  },
];

export const DEFAULT_STEP_ENTRY_KIND: StepEntryKind = 'step';

export const GAP_MESSAGE_MAX_LENGTH = 256;
export const GAP_SECONDS_MIN = 1;
export const GAP_SECONDS_MAX = 600;
export const DEFAULT_GAP_SECONDS = 15;

/** Anything carrying a kind, including raw API payloads and editor form values. */
interface KindedEntry {
  kind?: string | null;
}

/** Entries saved before gaps existed have no kind and are activity steps. */
export function stepEntryKind(entry: KindedEntry | null | undefined): StepEntryKind {
  return entry?.kind === 'gap' ? 'gap' : DEFAULT_STEP_ENTRY_KIND;
}

export function isGapEntry(entry: KindedEntry | null | undefined): boolean {
  return stepEntryKind(entry) === 'gap';
}

export function isActivityEntry(entry: KindedEntry | null | undefined): boolean {
  return !isGapEntry(entry);
}

export function activityEntries<T extends KindedEntry>(entries: readonly T[]): T[] {
  return entries.filter((entry) => isActivityEntry(entry));
}

export function activityCount(entries: readonly KindedEntry[]): number {
  return entries.reduce((total, entry) => total + (isActivityEntry(entry) ? 1 : 0), 0);
}

/** 1-based position of an entry among the activity steps, ignoring gaps. */
export function activityNumberAt(
  entries: readonly KindedEntry[],
  index: number,
): number | null {
  if (index < 0 || index >= entries.length) {
    return null;
  }
  return activityCount(entries.slice(0, index)) + 1;
}

export function activityIndexToEntryIndex(
  entries: readonly KindedEntry[],
  activityIndex: number,
): number | null {
  if (activityIndex < 0) {
    return null;
  }
  let seen = 0;
  for (let i = 0; i < entries.length; i += 1) {
    if (!isActivityEntry(entries[i])) {
      continue;
    }
    if (seen === activityIndex) {
      return i;
    }
    seen += 1;
  }
  return null;
}

export function firstActivityIndex(entries: readonly KindedEntry[]): number | null {
  return activityIndexToEntryIndex(entries, 0);
}

/** Nearest activity step at or after `index`, used when a gap is targeted directly. */
export function activityIndexAtOrAfter(
  entries: readonly KindedEntry[],
  index: number,
): number | null {
  for (let i = Math.max(0, index); i < entries.length; i += 1) {
    if (isActivityEntry(entries[i])) {
      return i;
    }
  }
  return null;
}

export function previousActivityIndex(
  entries: readonly KindedEntry[],
  index: number,
): number | null {
  for (let i = Math.min(index, entries.length) - 1; i >= 0; i -= 1) {
    if (isActivityEntry(entries[i])) {
      return i;
    }
  }
  return null;
}

/** Clamps a stored gap length to the supported range; 0 means "no gap". */
export function normaliseGapSeconds(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(GAP_SECONDS_MAX, Math.floor(value));
}

/** Clip window length in whole seconds, or 0 when the window is invalid. */
export function clipDurationSeconds(step: {
  startSeconds: number;
  endSeconds: number;
}): number {
  const length = step.endSeconds - step.startSeconds;
  if (!Number.isFinite(length) || length <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(length));
}

/** Intro gap length: optional override, otherwise the between-step gap. */
export function resolveStartGapSeconds(item: {
  playGapPriorToStart?: boolean;
  startGapSeconds?: number | null;
  gapSeconds?: number | null;
}): number {
  if (!item.playGapPriorToStart) {
    return 0;
  }
  const override = normaliseGapSeconds(item.startGapSeconds);
  return override > 0 ? override : normaliseGapSeconds(item.gapSeconds);
}

/** True when a custom start-gap length or message is stored. */
export function hasStartGapOverride(item: {
  startGapSeconds?: number | null;
  startGapMessage?: string | null;
}): boolean {
  return (
    normaliseGapSeconds(item.startGapSeconds) > 0 ||
    !!normaliseGapMessage(item.startGapMessage)
  );
}

/** Intro copy: optional override, otherwise the between-step gap message. */
export function resolveStartGapMessage(item: {
  playGapPriorToStart?: boolean;
  startGapMessage?: string | null;
  gapMessage?: string | null;
}): string | null {
  if (!item.playGapPriorToStart) {
    return null;
  }
  return normaliseGapMessage(item.startGapMessage) ?? normaliseGapMessage(item.gapMessage);
}

/** Timed steps always loop. Untimed steps loop unless loopVideo is false. */
export function shouldLoopVideo(step: {
  durationSeconds?: number | null;
  loopVideo?: boolean;
}): boolean {
  const timed = step.durationSeconds != null && step.durationSeconds > 0;
  return timed || step.loopVideo !== false;
}

export function normaliseGapMessage(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, GAP_MESSAGE_MAX_LENGTH);
}
