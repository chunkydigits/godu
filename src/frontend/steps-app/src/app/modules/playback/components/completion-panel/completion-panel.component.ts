import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../../../core/material.module';
import { StepsItem } from '../../models/steps-item.model';
import { StepDefinition } from '../../models/step-definition.model';

@Component({
  selector: 'app-completion-panel',
  imports: [MaterialModule, RouterLink],
  templateUrl: './completion-panel.component.html',
  styleUrl: './completion-panel.component.scss',
})
export class CompletionPanelComponent {
  @Input({ required: true }) stepsItem!: StepsItem;
  @Input() completedStep: StepDefinition | null = null;

  @Output() readonly replay = new EventEmitter<void>();
}
