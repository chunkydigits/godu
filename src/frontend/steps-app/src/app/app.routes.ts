import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./modules/playback/pages/home-page/home-page.component').then(
        (m) => m.HomePageComponent,
      ),
  },
  {
    path: 'play/:id',
    loadComponent: () =>
      import('./modules/playback/pages/viewer-page/viewer-page.component').then(
        (m) => m.ViewerPageComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
