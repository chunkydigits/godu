import { Injectable, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { Observable, catchError, filter, of, switchMap, take } from 'rxjs';
import { ViewerPreferencesService } from '../../playback/services/viewer-preferences.service';
import { UserSettingsApiService } from './user-settings-api.service';

/**
 * Playback defaults: local cache plus the signed-in user settings record.
 */
@Injectable({ providedIn: 'root' })
export class UserSettingsService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(UserSettingsApiService);
  private readonly preferences = inject(ViewerPreferencesService);

  readonly voiceCues$ = this.preferences.voiceCues$;

  get voiceCues(): boolean {
    return this.preferences.voiceCues;
  }

  /** Load signed-in defaults when available; guests keep the local cache. */
  hydrate(): Observable<boolean> {
    return this.whenAuthReady().pipe(
      switchMap((authenticated) => (authenticated ? this.api.get() : of(null))),
      catchError(() => of(null)),
      switchMap((settings) => {
        if (settings) {
          this.preferences.setVoiceCues(settings.useVoiceCuesByDefault);
        }
        return of(this.preferences.voiceCues);
      }),
    );
  }

  setUseVoiceCuesByDefault(enabled: boolean): void {
    this.preferences.setVoiceCues(enabled);
    this.whenAuthReady()
      .pipe(
        filter((authenticated) => authenticated),
        switchMap(() => this.api.update({ useVoiceCuesByDefault: enabled })),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  private whenAuthReady(): Observable<boolean> {
    return this.auth.isLoading$.pipe(
      filter((loading) => !loading),
      take(1),
      switchMap(() => this.auth.isAuthenticated$),
      take(1),
    );
  }
}
