import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { MaterialModule } from '../../../../core/material.module';

@Component({
  selector: 'app-landing-page',
  imports: [PageTemplateComponent, MaterialModule, RouterLink, AsyncPipe],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent {
  private readonly auth = inject(AuthService);

  readonly isAuthenticated$ = this.auth.isAuthenticated$;

  login(): void {
    this.auth.loginWithRedirect();
  }
}
