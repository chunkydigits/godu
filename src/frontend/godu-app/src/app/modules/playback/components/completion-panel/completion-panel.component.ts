import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../../../core/material.module';
import { StepsItem } from '../../models/steps-item.model';
import { StepDefinition } from '../../models/step-definition.model';
import { activityCount } from '../../models/step-entry';
import { CreatorNameComponent } from '../creator-name/creator-name.component';
import { PlatformMarkComponent } from '../platform-mark/platform-mark.component';

@Component({
  selector: 'app-completion-panel',
  imports: [MaterialModule, RouterLink, PlatformMarkComponent, CreatorNameComponent],
  templateUrl: './completion-panel.component.html',
  styleUrl: './completion-panel.component.scss',
})
export class CompletionPanelComponent {
  @Input({ required: true }) stepsItem!: StepsItem;
  @Input() completedStep: StepDefinition | null = null;
  @Input() relatedSteps: StepsItem[] = [];

  @Output() readonly replay = new EventEmitter<void>();

  /** Gaps are not steps, so they are left out of the counts shown here. */
  stepCount(item: StepsItem): number {
    return activityCount(item.steps);
  }
}
