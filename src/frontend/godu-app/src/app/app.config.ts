import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { authHttpInterceptorFn, provideAuth0 } from '@auth0/auth0-angular';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authHttpInterceptorFn])),
    provideAuth0({
      domain: environment.auth0.domain,
      clientId: environment.auth0.clientId,
      authorizationParams: {
        redirect_uri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4300',
        audience: environment.auth0.audience,
      },
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
