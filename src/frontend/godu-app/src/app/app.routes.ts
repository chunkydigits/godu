import { Routes } from '@angular/router';
import { authGuardFn } from '@auth0/auth0-angular';

export const routes: Routes = [
  {
    path: '',
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
    path: 'settings',
    canActivate: [authGuardFn],
    loadComponent: () =>
      import('./modules/settings/pages/settings-page/settings-page.component').then(
        (m) => m.SettingsPageComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
