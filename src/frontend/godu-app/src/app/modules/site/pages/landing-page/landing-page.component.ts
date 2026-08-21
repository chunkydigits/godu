import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { Observable, combineLatest, map } from 'rxjs';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { AnalyticsEvent } from '../../../../core/analytics/analytics-event';
import { AnalyticsService } from '../../../../core/analytics/analytics.service';
import { MaterialModule } from '../../../../core/material.module';
import { SignedInHomeComponent } from '../../components/signed-in-home/signed-in-home.component';

export type HomeMode = 'loading' | 'app' | 'marketing';

@Component({
  selector: 'app-landing-page',
  imports: [
    PageTemplateComponent,
    SignedInHomeComponent,
    MaterialModule,
    RouterLink,
    AsyncPipe,
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent {
  private readonly auth = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);

  readonly homeMode$: Observable<HomeMode> = combineLatest([
    this.auth.isLoading$,
    this.auth.isAuthenticated$,
  ]).pipe(
    map(([loading, authenticated]) =>
      loading ? 'loading' : authenticated ? 'app' : 'marketing',
    ),
  );

  login(): void {
    this.analytics.track(AnalyticsEvent.RegistrationStarted);
    this.auth.loginWithRedirect();
  }
}
