import { environment } from '../../../../environments/environment';

/**
 * A Steps item is an ordered list of entries. Most are activity steps, but an
 * entry can also be a gap (a rest that counts down before the next activity).
 * New kinds only need a `StepEntryKind` member, a catalogue entry, and handling
 * in the editor template and playback transition resolver.
 */
export type StepEntryKind = 'step' | 'gap' | 'card';

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
    kind: 'card',
    label: 'Card',
    hint: 'A timed card with a comment and countdown',
    icon: 'style',
  },
  {
    kind: 'gap',
    label: 'Gap',
    hint: 'A rest that counts down before the next step',
    icon: 'hourglass_empty',
  },
];

export const DEFAULT_STEP_ENTRY_KIND: StepEntryKind = 'step';
export const DEFAULT_CARD_ENTRY_KIND: StepEntryKind = 'card';

export const GAP_MESSAGE_MAX_LENGTH = 256;
export const GAP_SECONDS_MIN = 1;
export const GAP_SECONDS_MAX = 600;
export const CARD_SECONDS_MIN = GAP_SECONDS_MIN;
export const CARD_SECONDS_MAX = environment.playback.cardSecondsMax;
export const REPEAT_COUNT_MIN = 2;
export const REPEAT_COUNT_MAX = 99;
export const DEFAULT_GAP_SECONDS = 15;
export const DEFAULT_CARD_SECONDS = 15;
/** Default clip window for a new video step when no previous end time exists. */
export const DEFAULT_STEP_CLIP_SECONDS = 5;
export const DEFAULT_CARD_BACKGROUND = '#02c998';
export const DEFAULT_CARD_TEXT = '#002116';
export const CARD_COLOUR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/** Anything carrying a kind, including raw API payloads and editor form values. */
interface KindedEntry {
  kind?: string | null;
}

/** Entries saved before gaps existed have no kind and are activity steps. */
export function stepEntryKind(entry: KindedEntry | null | undefined): StepEntryKind {
  const value = entry?.kind?.trim().toLowerCase();
  if (value === 'gap') {
    return 'gap';
  }
  if (value === 'card') {
    return 'card';
  }
  return DEFAULT_STEP_ENTRY_KIND;
}

export function isGapEntry(entry: KindedEntry | null | undefined): boolean {
  return stepEntryKind(entry) === 'gap';
}

export function isCardEntry(entry: KindedEntry | null | undefined): boolean {
  return stepEntryKind(entry) === 'card';
}

export function isActivityEntry(entry: KindedEntry | null | undefined): boolean {
  return !isGapEntry(entry);
}

export function entryKindsForVideo(useVideoContent: boolean): readonly StepEntryKindOption[] {
  if (useVideoContent) {
    return STEP_ENTRY_KINDS;
  }
  return STEP_ENTRY_KINDS.filter((option) => option.kind !== 'step');
}

export function defaultEntryKind(useVideoContent: boolean): StepEntryKind {
  return useVideoContent ? DEFAULT_STEP_ENTRY_KIND : DEFAULT_CARD_ENTRY_KIND;
}

export function isHexColour(value: string | null | undefined): boolean {
  return !!value && CARD_COLOUR_PATTERN.test(value.trim());
}

export function normaliseCardColour(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed || !CARD_COLOUR_PATTERN.test(trimmed)) {
    return fallback;
  }
  return `#${trimmed.slice(1).toUpperCase()}`;
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

export function lastActivityIndex(entries: readonly KindedEntry[]): number | null {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (isActivityEntry(entries[i])) {
      return i;
    }
  }
  return null;
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
  return normaliseTimedSeconds(value, GAP_SECONDS_MAX);
}

/** Clamps a card countdown to the supported range; 0 means invalid. */
export function normaliseCardSeconds(value: number | null | undefined): number {
  return normaliseTimedSeconds(value, CARD_SECONDS_MAX);
}

function normaliseTimedSeconds(value: number | null | undefined, max: number): number {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(max, Math.floor(value));
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

/**
 * Clip loops unless loopVideo is false. Timed or untimed does not override that.
 * `loopAll` forces every clip to loop. `force` (when non-null) overrides both.
 */
export function shouldLoopVideo(
  step: {
    kind?: string | null;
    durationSeconds?: number | null;
    loopVideo?: boolean;
  },
  loopAll = false,
  force: boolean | null = null,
): boolean {
  if (isCardEntry(step)) {
    return false;
  }
  if (force != null) {
    return force;
  }
  if (loopAll) {
    return true;
  }
  return step.loopVideo !== false;
}

export function cardStillSeconds(entry: {
  kind?: string | null;
  stillSeconds?: number | null;
}): number | null {
  if (!isCardEntry(entry)) {
    return null;
  }
  const value = entry.stillSeconds;
  if (value == null || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

export function activityMediaSeconds(entry: {
  kind?: string | null;
  startSeconds?: number;
  stillSeconds?: number | null;
}): number {
  return cardStillSeconds(entry) ?? entry.startSeconds ?? 0;
}

export function activityUsesClip(
  entry: { kind?: string | null; stillSeconds?: number | null },
  useVideo: boolean,
): boolean {
  if (!useVideo || isGapEntry(entry)) {
    return false;
  }
  if (isCardEntry(entry)) {
    return cardStillSeconds(entry) != null;
  }
  return true;
}

export function activityDisplayTitle(entry: {
  kind?: string | null;
  title?: string | null;
  message?: string | null;
}): string {
  if (isCardEntry(entry)) {
    return entry.message?.trim() || 'Card';
  }
  return entry.title?.trim() || '—';
}

/** Colour card on screen, or the next card during a gap. Still cards use the video overlay. */
export function visibleInstructionCard<T extends { kind?: string | null; stillSeconds?: number | null }>(
  step: T | null | undefined,
  gapActive: boolean,
): T | null {
  if (!step || !isCardEntry(step)) {
    return null;
  }
  if (gapActive) {
    return step;
  }
  return cardStillSeconds(step) == null ? step : null;
}

/** Paused TikTok frame with comment + countdown over it. */
export function stillCardOverlay<T extends { kind?: string | null; stillSeconds?: number | null }>(
  step: T | null | undefined,
  gapActive: boolean,
): T | null {
  if (gapActive || !step || cardStillSeconds(step) == null) {
    return null;
  }
  return step;
}

export function normaliseGapMessage(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, GAP_MESSAGE_MAX_LENGTH);
}

/** Full passes of the Godu. 1 means a single run; 2 or more repeats the sequence. */
export function resolvedRepeatCount(item?: { repeatCount?: number | null }): number {
  const value = item?.repeatCount;
  if (value == null || !Number.isFinite(value) || value < REPEAT_COUNT_MIN) {
    return 1;
  }
  return Math.min(REPEAT_COUNT_MAX, Math.floor(value));
}

export function hasMoreIterations(iteration: number, iterationCount: number): boolean {
  return iterationCount > 1 && iteration < iterationCount;
}

export function hasPreviousIteration(iteration: number, iterationCount: number): boolean {
  return iterationCount > 1 && iteration > 1;
}

/** Caption beside the step label, or null when the Godu is a single pass. */
export function iterationCaption(
  iteration: number,
  iterationCount: number,
  show = true,
): string | null {
  if (!show || iterationCount < REPEAT_COUNT_MIN) {
    return null;
  }
  return `Iteration ${iteration} of ${iterationCount}`;
}

export function canGoToNextStep(options: {
  stepNumber: number | null;
  stepCount: number;
  iteration: number;
  iterationCount: number;
}): boolean {
  if (options.stepNumber == null || options.stepCount < 1) {
    return false;
  }
  if (options.stepNumber < options.stepCount) {
    return true;
  }
  return hasMoreIterations(options.iteration, options.iterationCount);
}

export function canGoToPreviousStep(options: {
  stepNumber: number | null;
  stepCount: number;
  iteration: number;
  iterationCount: number;
}): boolean {
  if (options.stepNumber == null || options.stepCount < 1) {
    return false;
  }
  if (options.stepNumber > 1) {
    return true;
  }
  return hasPreviousIteration(options.iteration, options.iterationCount);
}

export function isOnFinalStep(options: {
  stepNumber: number | null;
  stepCount: number;
  iteration: number;
  iterationCount: number;
}): boolean {
  return (
    options.stepNumber != null &&
    options.stepCount > 0 &&
    options.stepNumber === options.stepCount &&
    !hasMoreIterations(options.iteration, options.iterationCount)
  );
}

export function hasTimedActivity(
  entries: readonly { durationSeconds?: number | null; kind?: string | null }[],
): boolean {
  return activityEntries(entries).some(
    (entry) => entry.durationSeconds != null && entry.durationSeconds > 0,
  );
}

/** Spoken elapsed time for the completion summary, e.g. "12 minutes 4 seconds". */
export function formatElapsed(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(hours === 1 ? '1 hour' : `${hours} hours`);
  }
  if (minutes > 0) {
    parts.push(minutes === 1 ? '1 minute' : `${minutes} minutes`);
  }
  if (rest > 0 || parts.length === 0) {
    parts.push(rest === 1 ? '1 second' : `${rest} seconds`);
  }
  return parts.join(' ');
}

export function sessionTimeSummary(
  elapsedSeconds: number | null | undefined,
  timed: boolean,
): string | null {
  if (!timed || elapsedSeconds == null || elapsedSeconds < 0) {
    return null;
  }
  return `It took ${formatElapsed(elapsedSeconds)}.`;
}

/** Completion line after the title: steps, then iterations when the Godu repeats. */
export function sessionStepsSummary(stepCount: number, iterationCount: number): string {
  const steps = stepCount === 1 ? '1 step' : `${Math.max(0, Math.floor(stepCount))} steps`;
  if (iterationCount < REPEAT_COUNT_MIN) {
    return steps;
  }
  return `${steps}, ${iterationCount} iterations`;
}
