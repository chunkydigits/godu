import { AsyncPipe } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { AnalyticsEvent } from '../../core/analytics/analytics-event';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { CurrentUserService } from '../../core/auth/current-user.service';
import { MaterialModule } from '../../core/material.module';

@Component({
  selector: 'app-page-template',
  imports: [MaterialModule, RouterLink, AsyncPipe],
  templateUrl: './page-template.component.html',
  styleUrl: './page-template.component.scss',
})
export class PageTemplateComponent {
  private readonly auth = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);
  private readonly currentUser = inject(CurrentUserService);

  @Input() title = '';
  @Input() subtitle = '';
  @Input() showHeader = true;
  /** When true, content pane does not scroll (child manages overflow). */
  @Input() lockContentScroll = false;

  readonly isAuthenticated$ = this.auth.isAuthenticated$;
  readonly isAdmin$ = this.currentUser.isAdmin$;

  login(): void {
    this.auth.loginWithRedirect();
  }

  logout(): void {
    this.analytics.track(AnalyticsEvent.Logout);
    this.auth.logout({ logoutParams: { returnTo: window.location.origin } });
  }
}
