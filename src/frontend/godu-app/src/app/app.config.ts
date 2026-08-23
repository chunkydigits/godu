import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideServiceWorker } from '@angular/service-worker';
import { authHttpInterceptorFn, provideAuth0 } from '@auth0/auth0-angular';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authHttpInterceptorFn])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.features.serviceWorker,
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAuth0({
      domain: environment.auth0.domain,
      clientId: environment.auth0.clientId,
      authorizationParams: {
        redirect_uri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4300',
        audience: environment.auth0.audience,
      },
      // Memory cache + silent iframes drop the session on Safari / PWA / tab
      // restarts. Refresh tokens in localStorage keep you signed in.
      cacheLocation: 'localstorage',
      useRefreshTokens: true,
      useRefreshTokensFallback: true,
      httpInterceptor: {
        allowedList: [
          {
            uri: `${environment.apiBaseUrl}/api/public/*`,
            allowAnonymous: true,
          },
          {
            uri: `${environment.apiBaseUrl}/api/analytics/*`,
            allowAnonymous: true,
          },
          `${environment.apiBaseUrl}/api/me`,
          `${environment.apiBaseUrl}/api/me/*`,
          `${environment.apiBaseUrl}/api/creator/*`,
          `${environment.apiBaseUrl}/api/admin/*`,
        ],
      },
    }),
  ],
};
