import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../../../core/analytics/analytics.service';
import { MaterialModule } from '../../../../core/material.module';
import { publicViewerPath } from '../../models/public-path';
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

  private readonly analytics = inject(AnalyticsService);
  copied = false;
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  /** Gaps are not steps, so they are left out of the counts shown here. */
  stepCount(item: StepsItem): number {
    return activityCount(item.steps);
  }

  viewerLink(item: StepsItem): string {
    return publicViewerPath(item) ?? `/play/${item.id}`;
  }

  share(): void {
    const url = this.shareUrl();
    const props = {
      goduId: this.stepsItem.id,
      platform: this.stepsItem.video.provider ?? 'tiktok',
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      this.analytics.trackShare('native', props);
      void navigator.share({ title: this.stepsItem.title, url }).catch(() => {
        // User cancelled or the share sheet failed; the click is still recorded.
      });
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    void navigator.clipboard.writeText(url).then(() => {
      this.copied = true;
      this.analytics.trackShare('copy-link', props);
      if (this.copiedTimer) {
        clearTimeout(this.copiedTimer);
      }
      this.copiedTimer = setTimeout(() => {
        this.copied = false;
      }, 2000);
    });
  }

  private shareUrl(): string {
    if (typeof window === 'undefined') {
      return this.viewerLink(this.stepsItem);
    }

    return `${window.location.origin}${this.viewerLink(this.stepsItem)}`;
  }
}
