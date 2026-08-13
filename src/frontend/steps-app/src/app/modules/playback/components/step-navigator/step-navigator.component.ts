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

  select(index: number): void {
    this.stepSelected.emit(index);
  }
}
