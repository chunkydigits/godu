import { AsyncPipe } from '@angular/common';
import { Component, Input, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { MatSidenav } from '@angular/material/sidenav';
import { filter } from 'rxjs';
import { AnalyticsEvent } from '../../core/analytics/analytics-event';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { CurrentUserService } from '../../core/auth/current-user.service';
import { MaterialModule } from '../../core/material.module';

@Component({
  selector: 'app-page-template',
  imports: [MaterialModule, RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './page-template.component.html',
  styleUrl: './page-template.component.scss',
})
export class PageTemplateComponent {
  private readonly auth = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);
  private readonly currentUser = inject(CurrentUserService);
  private readonly router = inject(Router);

  readonly drawer = viewChild<MatSidenav>('drawer');

  @Input() title = '';
  @Input() subtitle = '';
  @Input() showHeader = true;
  /** When true, content pane does not scroll (child manages overflow). */
  @Input() lockContentScroll = false;

  readonly isAuthenticated$ = this.auth.isAuthenticated$;
  readonly isAdmin$ = this.currentUser.isAdmin$;

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeNav());
  }

  openNav(): void {
    void this.drawer()?.open();
  }

  closeNav(): void {
    void this.drawer()?.close();
  }

  login(): void {
    this.closeNav();
    this.auth.loginWithRedirect();
  }

  logout(): void {
    this.closeNav();
    this.analytics.track(AnalyticsEvent.Logout);
    this.auth.logout({ logoutParams: { returnTo: window.location.origin } });
  }
}
