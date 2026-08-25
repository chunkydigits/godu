import { StepEntryKind } from './step-entry';

export interface StepDefinition {
  id: string;
  order: number;
  /** Absent on entries saved before gaps existed, which are activity steps. */
  kind?: StepEntryKind;
  title: string;
  description?: string;
  startSeconds: number;
  endSeconds: number;
  /** Activity length, or the rest length on a gap entry. */
  durationSeconds?: number | null;
  autoAdvance: boolean;
  /**
   * Loop the clip, or play it once. Missing means loop.
   * Timed play-once still runs the duration timer; untimed play-once holds the step copy.
   */
  loopVideo?: boolean;
  /** Gap or card copy shown while the entry counts down. */
  message?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  /** When set, the card shows a paused video frame at this time. */
  stillSeconds?: number | null;
}
