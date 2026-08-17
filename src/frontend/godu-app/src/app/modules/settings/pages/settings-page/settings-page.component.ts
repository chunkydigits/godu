import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import {
  Observable,
  Subject,
  catchError,
  map,
  merge,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { MaterialModule } from '../../../../core/material.module';
import { LinkedPlatformAccount } from '../../models/linked-platform-account.model';
import { PlatformAccountsApiService } from '../../services/platform-accounts-api.service';

interface SettingsView {
  loading: boolean;
  connecting: boolean;
  accounts: LinkedPlatformAccount[];
  error: string | null;
  actionMessage: string | null;
}

@Component({
  selector: 'app-settings-page',
  imports: [PageTemplateComponent, MaterialModule, AsyncPipe],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
})
export class SettingsPageComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly platformAccounts = inject(PlatformAccountsApiService);

  private readonly connect$ = new Subject<void>();
  private readonly disconnectId$ = new Subject<string>();

  readonly user$ = this.auth.user$;

  readonly notice$ = this.route.queryParamMap.pipe(
    map((params) => ({
      linked: params.get('linked'),
      error: mapConnectError(params.get('error')),
    })),
  );

  readonly view$: Observable<SettingsView> = merge(
    this.loadView(),
    this.connect$.pipe(
      switchMap(() =>
        this.platformAccounts.startConnect('tiktok').pipe(
          tap((started) => {
            window.location.assign(started.authorizationUrl);
          }),
          map(
            (): SettingsView => ({
              loading: false,
              connecting: true,
              accounts: [],
              error: null,
              actionMessage: 'Redirecting to TikTok…',
            }),
          ),
          startWith({
            loading: false,
            connecting: true,
            accounts: [],
            error: null,
            actionMessage: null,
          }),
          catchError((err: unknown) => of(toErrorView(err, 'Could not start TikTok connect.'))),
        ),
      ),
    ),
    this.disconnectId$.pipe(
      switchMap((id) =>
        this.platformAccounts.disconnect(id).pipe(
          switchMap(() =>
            this.loadView('TikTok account disconnected.'),
          ),
          startWith({
            loading: true,
            connecting: false,
            accounts: [] as LinkedPlatformAccount[],
            error: null,
            actionMessage: null,
          }),
          catchError((err: unknown) => of(toErrorView(err, 'Could not disconnect account.'))),
        ),
      ),
    ),
  );

  connectTikTok(): void {
    this.connect$.next();
  }

  confirmDisconnect(account: LinkedPlatformAccount): void {
    const label = account.username ? `@${account.username}` : account.provider;
    if (typeof window !== 'undefined' && window.confirm(`Disconnect ${label}?`)) {
      this.disconnectId$.next(account.id);
    }
  }

  private loadView(actionMessage: string | null = null): Observable<SettingsView> {
    return this.platformAccounts.list().pipe(
      map(
        (accounts): SettingsView => ({
          loading: false,
          connecting: false,
          accounts,
          error: null,
          actionMessage,
        }),
      ),
      startWith({
        loading: true,
        connecting: false,
        accounts: [] as LinkedPlatformAccount[],
        error: null,
        actionMessage: null,
      }),
      catchError((err: unknown) => of(toErrorView(err, 'Could not load creator accounts.'))),
    );
  }
}

function mapConnectError(code: string | null): string | null {
  switch (code) {
    case 'denied':
      return 'TikTok connect was cancelled.';
    case 'conflict':
      return 'That TikTok account is already linked to another Godu user.';
    case 'invalid':
      return 'TikTok connect expired or was invalid. Try again.';
    case 'failed':
      return 'TikTok connect failed. Check Login Kit credentials and try again.';
    default:
      return null;
  }
}

function toErrorView(err: unknown, fallback: string): SettingsView {
  const detail =
    err instanceof HttpErrorResponse
      ? err.error?.detail || err.message || fallback
      : fallback;

  return {
    loading: false,
    connecting: false,
    accounts: [],
    error: detail,
    actionMessage: null,
  };
}
