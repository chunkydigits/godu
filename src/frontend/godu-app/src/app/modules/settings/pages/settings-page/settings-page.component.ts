import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
import {
  CreatorProfile,
  UpdateCreatorProfileRequest,
} from '../../../creators/models/creator-profile.model';
import { MineCreatorProfileApiService } from '../../../creators/services/mine-creator-profile-api.service';
import { publicCreatorPath } from '../../../playback/models/public-path';
import {
  LinkedPlatformAccount,
  RefreshHandleResult,
} from '../../models/linked-platform-account.model';
import { PlatformAccountsApiService } from '../../services/platform-accounts-api.service';
import { UserSettingsService } from '../../services/user-settings.service';

interface SettingsView {
  loading: boolean;
  connecting: boolean;
  refreshing: boolean;
  accounts: LinkedPlatformAccount[];
  error: string | null;
  actionMessage: string | null;
}

interface ProfileEditorView {
  loading: boolean;
  saving: boolean;
  profile: CreatorProfile | null;
  error: string | null;
  actionMessage: string | null;
}

@Component({
  selector: 'app-settings-page',
  imports: [PageTemplateComponent, MaterialModule, AsyncPipe, FormsModule, RouterLink],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
})
export class SettingsPageComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly platformAccounts = inject(PlatformAccountsApiService);
  private readonly userSettings = inject(UserSettingsService);
  private readonly creatorProfile = inject(MineCreatorProfileApiService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  private readonly connect$ = new Subject<void>();
  private readonly disconnectId$ = new Subject<string>();
  private readonly refreshId$ = new Subject<string>();
  private readonly saveProfile$ = new Subject<void>();
  private readonly importProfile$ = new Subject<void>();
  private readonly reloadProfile$ = new Subject<void>();

  displayName = '';
  bio = '';
  profileImageUrl = '';
  readonly profileImageMaxLength = 100_000;
  imageFailed = false;
  previewKey = 0;
  private lastProfile: CreatorProfile | null = null;

  readonly user$ = this.auth.user$;
  readonly voiceCues$ = this.userSettings.voiceCues$;

  readonly notice$ = this.route.queryParamMap.pipe(
    map((params) => ({
      linked: params.get('linked'),
      error: mapConnectError(params.get('error')),
    })),
  );

  constructor() {
    this.userSettings.hydrate().subscribe();
  }

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
              refreshing: false,
              accounts: [],
              error: null,
              actionMessage: 'Redirecting to TikTok…',
            }),
          ),
          startWith({
            loading: false,
            connecting: true,
            refreshing: false,
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
            refreshing: false,
            accounts: [] as LinkedPlatformAccount[],
            error: null,
            actionMessage: null,
          }),
          catchError((err: unknown) => of(toErrorView(err, 'Could not disconnect account.'))),
        ),
      ),
    ),
    this.refreshId$.pipe(
      switchMap((id) =>
        this.platformAccounts.refreshHandle(id).pipe(
          switchMap((result) =>
            this.loadView(refreshHandleMessage(result)).pipe(
              tap((view) => {
                if (!view.loading && !view.error) {
                  this.reloadProfile$.next();
                }
              }),
            ),
          ),
          startWith({
            loading: false,
            connecting: false,
            refreshing: true,
            accounts: [] as LinkedPlatformAccount[],
            error: null,
            actionMessage: 'Checking TikTok for your current handle…',
          }),
          catchError((err: unknown) => of(toErrorView(err, 'Could not refresh handle.'))),
        ),
      ),
    ),
  );

  readonly profileView$: Observable<ProfileEditorView> = merge(
    this.loadProfile(),
    this.reloadProfile$.pipe(switchMap(() => this.loadProfile())),
    this.saveProfile$.pipe(switchMap(() => this.saveProfile())),
    this.importProfile$.pipe(switchMap(() => this.importProfile())),
  );

  connectTikTok(): void {
    this.connect$.next();
  }

  onVoiceCuesDefaultChange(enabled: boolean): void {
    this.userSettings.setUseVoiceCuesByDefault(enabled);
  }

  confirmDisconnect(account: LinkedPlatformAccount): void {
    const label = account.username ? `@${account.username}` : account.provider;
    if (typeof window !== 'undefined' && window.confirm(`Disconnect ${label}?`)) {
      this.disconnectId$.next(account.id);
    }
  }

  refreshHandle(account: LinkedPlatformAccount): void {
    this.refreshId$.next(account.id);
  }

  savePublicProfile(): void {
    this.saveProfile$.next();
  }

  importPublicProfile(): void {
    this.importProfile$.next();
  }

  publicPagePath(profile: CreatorProfile): string | null {
    const social = profile.socials[0];
    return social ? publicCreatorPath(social.provider, social.username) : null;
  }

  formatAliases(aliases: string[]): string {
    return aliases.map((alias) => `@${alias}`).join(', ');
  }

  get previewImageSrc(): string | null {
    const url = this.profileImageUrl.trim();
    return url || null;
  }

  onProfileImageUrlChange(): void {
    this.imageFailed = false;
    this.changeDetector.markForCheck();
  }

  private loadView(actionMessage: string | null = null): Observable<SettingsView> {
    return this.platformAccounts.list().pipe(
      map(
        (accounts): SettingsView => ({
          loading: false,
          connecting: false,
          refreshing: false,
          accounts,
          error: null,
          actionMessage,
        }),
      ),
      startWith({
        loading: true,
        connecting: false,
        refreshing: false,
        accounts: [] as LinkedPlatformAccount[],
        error: null,
        actionMessage: null,
      }),
      catchError((err: unknown) => of(toErrorView(err, 'Could not load creator accounts.'))),
    );
  }

  private loadProfile(): Observable<ProfileEditorView> {
    return this.creatorProfile.get().pipe(
      tap((profile) => this.applyProfile(profile)),
      map((profile): ProfileEditorView => ({
        loading: false,
        saving: false,
        profile,
        error: null,
        actionMessage: null,
      })),
      startWith({
        loading: true,
        saving: false,
        profile: null,
        error: null,
        actionMessage: null,
      }),
      catchError((err: unknown) => of(this.toProfileErrorView(err, 'Could not load public profile.'))),
    );
  }

  private saveProfile(): Observable<ProfileEditorView> {
    const request: UpdateCreatorProfileRequest = {
      displayName: this.displayName.trim(),
      bio: this.bio,
      profileImageUrl: this.profileImageUrl.trim(),
    };
    return this.creatorProfile.update(request).pipe(
      tap((profile) => this.applyProfile(profile)),
      map((profile): ProfileEditorView => ({
        loading: false,
        saving: false,
        profile,
        error: null,
        actionMessage: 'Public profile saved.',
      })),
      startWith({
        loading: false,
        saving: true,
        profile: this.lastProfile,
        error: null,
        actionMessage: null,
      }),
      catchError((err: unknown) => of(this.toProfileErrorView(err, 'Could not save public profile.'))),
    );
  }

  private importProfile(): Observable<ProfileEditorView> {
    return this.creatorProfile.importFromSocial().pipe(
      tap((profile) => this.applyProfile(profile)),
      map((profile): ProfileEditorView => ({
        loading: false,
        saving: false,
        profile,
        error: null,
        actionMessage: 'Imported name, profile image, and description from TikTok.',
      })),
      startWith({
        loading: false,
        saving: true,
        profile: this.lastProfile,
        error: null,
        actionMessage: null,
      }),
      catchError((err: unknown) =>
        of(this.toProfileErrorView(err, 'Could not import from TikTok. Reconnect the account and try again.')),
      ),
    );
  }

  private applyProfile(profile: CreatorProfile): void {
    this.lastProfile = profile;
    this.displayName = profile.displayName ?? '';
    this.bio = profile.bio ?? '';
    this.profileImageUrl = profile.profileImageUrl ?? '';
    this.refreshPreview(true);
  }

  private refreshPreview(forceReload: boolean): void {
    this.imageFailed = false;
    if (forceReload) {
      this.previewKey += 1;
    }
    this.changeDetector.markForCheck();
  }

  private toProfileErrorView(err: unknown, fallback: string): ProfileEditorView {
    if (err instanceof HttpErrorResponse && err.status === 404 && !this.lastProfile) {
      return {
        loading: false,
        saving: false,
        profile: null,
        error: null,
        actionMessage: null,
      };
    }

    const detail =
      err instanceof HttpErrorResponse
        ? err.error?.detail || err.error?.title || err.message || fallback
        : fallback;

    return {
      loading: false,
      saving: false,
      profile: this.lastProfile,
      error: detail,
      actionMessage: null,
    };
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
    refreshing: false,
    accounts: [],
    error: detail,
    actionMessage: null,
  };
}

function refreshHandleMessage(result: RefreshHandleResult): string {
  const current = result.account.username ? `@${result.account.username}` : 'your TikTok handle';
  if (!result.handleChanged) {
    return `Handle is still ${current}.`;
  }

  const previous = result.previousUsername ? `@${result.previousUsername}` : 'the old handle';
  const count = result.updatedStepsCount;
  const rewritten =
    count === 1 ? '1 Godu URL now uses' : `${count} Godu URLs now use`;
  return `Handle updated from ${previous} to ${current}. ${rewritten} ${current}. Old links still work.`;
}
