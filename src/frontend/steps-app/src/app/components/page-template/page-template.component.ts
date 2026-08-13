import { Component, Input } from '@angular/core';
import { MaterialModule } from '../../core/material.module';

@Component({
  selector: 'app-page-template',
  imports: [MaterialModule],
  templateUrl: './page-template.component.html',
  styleUrl: './page-template.component.scss',
})
export class PageTemplateComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() showHeader = true;
}
