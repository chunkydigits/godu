import { Routes } from '@angular/router';
import { authGuardFn } from '@auth0/auth0-angular';
import { adminGuardFn } from './core/auth/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./modules/site/pages/landing-page/landing-page.component').then(
        (m) => m.LandingPageComponent,
      ),
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./modules/site/pages/terms-page/terms-page.component').then(
        (m) => m.TermsPageComponent,
      ),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./modules/site/pages/privacy-page/privacy-page.component').then(
        (m) => m.PrivacyPageComponent,
      ),
  },
  {
    path: 'demos',
    loadComponent: () =>
      import('./modules/playback/pages/home-page/home-page.component').then(
        (m) => m.HomePageComponent,
      ),
  },
  {
    path: 'my-steps/new',
    canActivate: [authGuardFn],
    loadComponent: () =>
      import('./modules/playback/pages/steps-editor-page/steps-editor-page.component').then(
        (m) => m.StepsEditorPageComponent,
      ),
  },
  {
    path: 'my-steps/:id/edit',
    canActivate: [authGuardFn],
    loadComponent: () =>
      import('./modules/playback/pages/steps-editor-page/steps-editor-page.component').then(
        (m) => m.StepsEditorPageComponent,
      ),
  },
  {
    path: 'my-steps',
    canActivate: [authGuardFn],
    loadComponent: () =>
      import('./modules/playback/pages/my-steps-page/my-steps-page.component').then(
        (m) => m.MyStepsPageComponent,
      ),
  },
  {
    path: 'play/:id',
    loadComponent: () =>
      import('./modules/playback/pages/viewer-page/viewer-page.component').then(
        (m) => m.ViewerPageComponent,
      ),
  },
  {
    path: 'creator',
    canActivate: [authGuardFn],
    loadComponent: () =>
      import('./modules/creators/pages/creator-dashboard-page/creator-dashboard-page.component').then(
        (m) => m.CreatorDashboardPageComponent,
      ),
  },
  {
    path: 'u/:userId',
    loadComponent: () =>
      import('./modules/creators/pages/creator-profile-page/creator-profile-page.component').then(
        (m) => m.CreatorProfilePageComponent,
      ),
  },
  {
    path: 'settings',
    canActivate: [authGuardFn],
    loadComponent: () =>
      import('./modules/settings/pages/settings-page/settings-page.component').then(
        (m) => m.SettingsPageComponent,
      ),
  },
  {
    path: 'admin/analytics',
    canActivate: [authGuardFn, adminGuardFn],
    loadComponent: () =>
      import('./modules/admin/pages/admin-analytics-page/admin-analytics-page.component').then(
        (m) => m.AdminAnalyticsPageComponent,
      ),
  },
  {
    path: 'admin',
    canActivate: [authGuardFn, adminGuardFn],
    loadComponent: () =>
      import('./modules/admin/pages/admin-dashboard-page/admin-dashboard-page.component').then(
        (m) => m.AdminDashboardPageComponent,
      ),
  },
  {
    path: 'tiktok/callback',
    loadComponent: () =>
      import('./modules/settings/pages/tiktok-oauth-callback/tiktok-oauth-callback.component').then(
        (m) => m.TikTokOAuthCallbackComponent,
      ),
  },
  {
    path: 't/:username/:slug',
    data: { provider: 'tiktok' },
    loadComponent: () =>
      import('./modules/playback/pages/viewer-page/viewer-page.component').then(
        (m) => m.ViewerPageComponent,
      ),
  },
  {
    path: 'tiktok/:username/:slug',
    data: { provider: 'tiktok' },
    loadComponent: () =>
      import('./modules/playback/pages/viewer-page/viewer-page.component').then(
        (m) => m.ViewerPageComponent,
      ),
  },
  {
    path: 't/:username',
    data: { provider: 'tiktok' },
    loadComponent: () =>
      import('./modules/creators/pages/creator-profile-page/creator-profile-page.component').then(
        (m) => m.CreatorProfilePageComponent,
      ),
  },
  {
    path: 'tiktok/:username',
    data: { provider: 'tiktok' },
    loadComponent: () =>
      import('./modules/creators/pages/creator-profile-page/creator-profile-page.component').then(
        (m) => m.CreatorProfilePageComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
