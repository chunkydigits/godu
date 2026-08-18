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
  /** Gap entries only: copy shown while the gap counts down. */
  message?: string | null;
}
