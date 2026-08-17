import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { LegalArticleComponent } from '../../components/legal-article/legal-article.component';

@Component({
  selector: 'app-terms-page',
  imports: [PageTemplateComponent, LegalArticleComponent, RouterLink],
  templateUrl: './terms-page.component.html',
  styleUrl: './terms-page.component.scss',
})
export class TermsPageComponent {}
