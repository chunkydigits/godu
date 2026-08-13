export interface StepDefinition {
  id: string;
  order: number;
  title: string;
  description?: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds?: number | null;
  autoAdvance: boolean;
}
