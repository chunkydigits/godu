import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../../../core/material.module';
import {
  CONTINUOUS_SOUNDTRACK_TIP,
  EDITOR_SECTIONS,
  EditorSection,
  EditorSectionId,
} from '../../models/editor-sections';
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
  imports: [MaterialModule, ReactiveFormsModule, DragDropModule, NgTemplateOutlet],
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
  /** The one open section, if any: the panels act as an accordion. */
  @Input() openSection: EditorSectionId | null = null;

  @Output() readonly addEntry = new EventEmitter<StepEntryKind>();
  @Output() readonly removeEntry = new EventEmitter<number>();
  @Output() readonly toggleEntry = new EventEmitter<number>();
  @Output() readonly toggleSection = new EventEmitter<EditorSectionId>();
  @Output() readonly entryDropped = new EventEmitter<CdkDragDrop<unknown>>();

  readonly sections = EDITOR_SECTIONS;
  readonly entryKinds = STEP_ENTRY_KINDS;
  readonly defaultKind = DEFAULT_STEP_ENTRY_KIND;
  readonly gapSecondsMin = GAP_SECONDS_MIN;
  readonly gapSecondsMax = GAP_SECONDS_MAX;
  readonly gapMessageMaxLength = GAP_MESSAGE_MAX_LENGTH;

  /** Tips are a peek at one section at a time rather than a pinned panel. */
  private openTips: EditorSectionId | null = null;

  get steps(): FormArray {
    return this.form.get('steps') as FormArray;
  }

  isSectionOpen(id: EditorSectionId): boolean {
    return this.openSection === id;
  }

  areTipsOpen(id: EditorSectionId): boolean {
    return this.openTips === id;
  }

  toggleTips(id: EditorSectionId): void {
    this.openTips = this.openTips === id ? null : id;
  }

  tipsFor(section: EditorSection): readonly string[] {
    if (section.id === 'video' && this.continuousSoundtrackEnabled) {
      return [...section.tips, CONTINUOUS_SOUNDTRACK_TIP];
    }
    return section.tips;
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
