import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../../../core/material.module';
import {
  DEFAULT_STEP_ENTRY_KIND,
  GAP_MESSAGE_MAX_LENGTH,
  GAP_SECONDS_MAX,
  GAP_SECONDS_MIN,
  STEP_ENTRY_KINDS,
  StepEntryKind,
  activityNumberAt,
  isGapEntry,
} from '../../models/step-entry';

@Component({
  selector: 'app-steps-editor-form',
  imports: [MaterialModule, ReactiveFormsModule, DragDropModule],
  templateUrl: './steps-editor-form.component.html',
  styleUrl: './steps-editor-form.component.scss',
})
export class StepsEditorFormComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() continuousSoundtrackEnabled = false;
  /** Whether the last remaining activity step is protected from removal. */
  @Input() activityStepCount = 0;
  /** Entries the page has collapsed, keyed by control so reordering is safe. */
  @Input() collapsedEntries = new Set<AbstractControl>();

  @Output() readonly addEntry = new EventEmitter<StepEntryKind>();
  @Output() readonly removeEntry = new EventEmitter<number>();
  @Output() readonly toggleEntry = new EventEmitter<number>();
  @Output() readonly entryDropped = new EventEmitter<CdkDragDrop<unknown>>();

  readonly entryKinds = STEP_ENTRY_KINDS;
  readonly defaultKind = DEFAULT_STEP_ENTRY_KIND;
  readonly gapSecondsMin = GAP_SECONDS_MIN;
  readonly gapSecondsMax = GAP_SECONDS_MAX;
  readonly gapMessageMaxLength = GAP_MESSAGE_MAX_LENGTH;

  get steps(): FormArray {
    return this.form.get('steps') as FormArray;
  }

  isGap(index: number): boolean {
    return isGapEntry(this.entryAt(index));
  }

  /** Editor heading number, counting activity steps only. */
  activityNumber(index: number): number | null {
    return activityNumberAt(this.entries, index);
  }

  canRemove(index: number): boolean {
    return this.isGap(index) || this.activityStepCount > 1;
  }

  isExpanded(index: number): boolean {
    const control = this.steps.at(index);
    return !control || !this.collapsedEntries.has(control);
  }

  stepTitle(index: number): string {
    return this.entryAt(index)?.title?.trim() || 'Untitled step';
  }

  /** Clip window and timed length, e.g. "0 → 10 (8s)". */
  stepTiming(index: number): string {
    const entry = this.entryAt(index);
    const start = formatSeconds(entry?.startSeconds);
    const end = formatSeconds(entry?.endSeconds);
    const duration = toNumber(entry?.durationSeconds);
    const length = duration != null && duration > 0 ? `${duration}s` : 'untimed';
    return `${start} → ${end} (${length})`;
  }

  isAutoAdvance(index: number): boolean {
    return !!this.entryAt(index)?.autoAdvance;
  }

  gapSummary(index: number): string {
    const entry = this.entryAt(index);
    const seconds = toNumber(entry?.durationSeconds);
    const length = seconds != null && seconds > 0 ? `${seconds}s` : '—';
    const message = entry?.message?.trim();
    return message ? `${length} · ${message}` : length;
  }

  private get entries(): StepEntrySummary[] {
    return this.steps.controls.map((control) => this.toEntry(control.getRawValue()));
  }

  private entryAt(index: number): StepEntrySummary | null {
    const control = this.steps.at(index);
    return control ? this.toEntry(control.getRawValue()) : null;
  }

  private toEntry(value: unknown): StepEntrySummary {
    return (value ?? {}) as StepEntrySummary;
  }
}

interface StepEntrySummary {
  kind?: string | null;
  title?: string;
  startSeconds?: number | string;
  endSeconds?: number | string;
  durationSeconds?: number | string | null;
  autoAdvance?: boolean;
  message?: string;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatSeconds(value: number | string | null | undefined): string {
  const parsed = toNumber(value);
  return parsed == null ? '—' : `${parsed}s`;
}
