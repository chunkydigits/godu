import { Component } from '@angular/core';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { LegalArticleComponent } from '../../components/legal-article/legal-article.component';

@Component({
  selector: 'app-privacy-page',
  imports: [PageTemplateComponent, LegalArticleComponent],
  templateUrl: './privacy-page.component.html',
  styleUrl: './privacy-page.component.scss',
})
export class PrivacyPageComponent {}
