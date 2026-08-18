import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MaterialModule } from '../../../../core/material.module';
import { StepDefinition } from '../../models/step-definition.model';

@Component({
  selector: 'app-step-navigator',
  imports: [MaterialModule],
  templateUrl: './step-navigator.component.html',
  styleUrl: './step-navigator.component.scss',
})
export class StepNavigatorComponent {
  @Input({ required: true }) steps: StepDefinition[] = [];
  @Input() selectedIndex = -1;

  @Output() readonly stepSelected = new EventEmitter<number>();

  readonly displayLabel = (value: number): string => {
    const step = this.steps[value];
    return step ? String(step.order) : String(value + 1);
  };

  get maxIndex(): number {
    return Math.max(0, this.steps.length - 1);
  }

  get sliderValue(): number {
    return this.selectedIndex < 0 ? 0 : this.selectedIndex;
  }

  get atStart(): boolean {
    return this.steps.length === 0 || this.selectedIndex <= 0;
  }

  get atEnd(): boolean {
    return this.steps.length === 0 || this.selectedIndex >= this.steps.length - 1;
  }

  get currentLabel(): string {
    if (this.steps.length === 0) {
      return 'No steps';
    }

    if (this.selectedIndex < 0) {
      return `— / ${this.steps.length}`;
    }

    return `${this.selectedIndex + 1} / ${this.steps.length}`;
  }

  previous(): void {
    if (this.atStart) {
      return;
    }

    this.select(this.selectedIndex - 1);
  }

  next(): void {
    if (this.atEnd) {
      return;
    }

    const from = this.selectedIndex < 0 ? -1 : this.selectedIndex;
    this.select(from + 1);
  }

  onSlider(value: number): void {
    const index = Math.round(value);
    if (index === this.selectedIndex) {
      return;
    }

    this.select(index);
  }

  select(index: number): void {
    this.stepSelected.emit(index);
  }
}
