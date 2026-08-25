import { Component, Input } from '@angular/core';
import { countdownProgress, formatCountdown } from '../../models/duration';
import {
  DEFAULT_CARD_BACKGROUND,
  DEFAULT_CARD_TEXT,
  activityDisplayTitle,
} from '../../models/step-entry';
import { StepDefinition } from '../../models/step-definition.model';

@Component({
  selector: 'app-instruction-card',
  templateUrl: './instruction-card.component.html',
  styleUrl: './instruction-card.component.scss',
})
export class InstructionCardComponent {
  @Input({ required: true }) card!: StepDefinition;
  @Input() remainingSeconds: number | null = null;
  @Input() preview = false;
  @Input() overlay = false;
  @Input() stage = false;

  get background(): string {
    return this.card.backgroundColor?.trim() || DEFAULT_CARD_BACKGROUND;
  }

  get text(): string {
    return this.card.textColor?.trim() || DEFAULT_CARD_TEXT;
  }

  get title(): string {
    return activityDisplayTitle(this.card);
  }

  get remainingLabel(): string {
    return formatCountdown(this.remainingSeconds);
  }

  get progress(): number {
    return countdownProgress(this.remainingSeconds, this.card?.durationSeconds);
  }

  get ringOffset(): number {
    return 100 - this.progress;
  }
}
