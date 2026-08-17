import { AsyncPipe } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { MaterialModule } from '../../core/material.module';

@Component({
  selector: 'app-page-template',
  imports: [MaterialModule, RouterLink, AsyncPipe],
  templateUrl: './page-template.component.html',
  styleUrl: './page-template.component.scss',
})
export class PageTemplateComponent {
  private readonly auth = inject(AuthService);

  @Input() title = '';
  @Input() subtitle = '';
  @Input() showHeader = true;
  /** When true, content pane does not scroll (child manages overflow). */
  @Input() lockContentScroll = false;

  readonly isAuthenticated$ = this.auth.isAuthenticated$;

  login(): void {
    this.auth.loginWithRedirect();
  }

  logout(): void {
    this.auth.logout({ logoutParams: { returnTo: window.location.origin } });
  }
}
