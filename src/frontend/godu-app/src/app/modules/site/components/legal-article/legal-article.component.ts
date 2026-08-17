import { Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-legal-article',
  templateUrl: './legal-article.component.html',
  styleUrl: './legal-article.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class LegalArticleComponent {
  @Input() lastUpdated = '';
}
