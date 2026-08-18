import { Component, Input } from '@angular/core';
import { StepsItem } from '../../models/steps-item.model';
import { creatorLabel, tiktokHomepageUrl } from '../../models/creator-link';

@Component({
  selector: 'app-creator-name',
  templateUrl: './creator-name.component.html',
  styleUrl: './creator-name.component.scss',
})
export class CreatorNameComponent {
  @Input({ required: true }) item!: StepsItem;

  get label(): string {
    return creatorLabel(this.item);
  }

  get href(): string | null {
    return tiktokHomepageUrl(this.item);
  }
}
