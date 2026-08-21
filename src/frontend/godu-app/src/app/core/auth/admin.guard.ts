import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { catchError, filter, map, of, switchMap, take } from 'rxjs';
import { MeApiService } from './me-api.service';

export const adminGuardFn: CanActivateFn = () => {
  const auth = inject(AuthService);
  const me = inject(MeApiService);
  const router = inject(Router);

  return auth.isLoading$.pipe(
    filter((loading) => !loading),
    take(1),
    switchMap(() => auth.isAuthenticated$),
    take(1),
    switchMap((authenticated) => {
      if (!authenticated) {
        return of(router.createUrlTree(['/']));
      }

      return me.get().pipe(
        map((profile) => (profile.isAdmin ? true : router.createUrlTree(['/']))),
        catchError(() => of(router.createUrlTree(['/']))),
      );
    }),
  );
};
