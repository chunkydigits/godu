import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import {
  Observable,
  Subject,
  catchError,
  combineLatest,
  map,
  merge,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { problemDetail } from '../../../../core/http-problem';
import { MaterialModule } from '../../../../core/material.module';
import { CreatorStepsApiService } from '../../../creators/services/creator-steps-api.service';
import { PlatformAccountsApiService } from '../../../settings/services/platform-accounts-api.service';
import { ApiStepsItem } from '../../models/api-steps-item.model';
import { isValidSlug, publicViewerPath, slugFromTitle } from '../../models/public-path';
import { MyStepsApiService } from '../../services/my-steps-api.service';

interface MyStepsView {
  authenticated: boolean;
  loading: boolean;
  items: ApiStepsItem[];
  canPublish: boolean;
  error: string | null;
  actionMessage: string | null;
}

type MyStepsAction =
  | { kind: 'archive'; id: string }
  | { kind: 'publish'; id: string; slug: string }
  | { kind: 'unpublish'; id: string };

const emptyView = (overrides: Partial<MyStepsView> = {}): MyStepsView => ({
  authenticated: true,
  loading: false,
  items: [],
  canPublish: false,
  error: null,
  actionMessage: null,
  ...overrides,
});

@Component({
  selector: 'app-my-steps-page',
  imports: [PageTemplateComponent, MaterialModule, RouterLink, AsyncPipe, FormsModule],
  templateUrl: './my-steps-page.component.html',
  styleUrl: './my-steps-page.component.scss',
})
export class MyStepsPageComponent {
  private readonly auth = inject(AuthService);
  private readonly myStepsApi = inject(MyStepsApiService);
  private readonly creatorSteps = inject(CreatorStepsApiService);
  private readonly platformAccounts = inject(PlatformAccountsApiService);

  private readonly actions$ = new Subject<MyStepsAction>();

  publishingId: string | null = null;
  slugDraft = '';
  copiedId: string | null = null;
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isAuthenticated$ = this.auth.isAuthenticated$;

  readonly view$: Observable<MyStepsView> = merge(
    this.auth.isAuthenticated$.pipe(
      switchMap((authenticated) => this.loadView(authenticated)),
    ),
    this.actions$.pipe(switchMap((action) => this.runAction(action))),
  );

  confirmArchive(item: ApiStepsItem): void {
    if (typeof window !== 'undefined' && window.confirm(`Archive “${item.title}”?`)) {
      this.actions$.next({ kind: 'archive', id: item.id });
    }
  }

  startPublish(item: ApiStepsItem): void {
    this.publishingId = item.id;
    this.slugDraft = item.slug || slugFromTitle(item.title);
  }

  cancelPublish(): void {
    this.publishingId = null;
    this.slugDraft = '';
  }

  confirmPublish(item: ApiStepsItem): void {
    const slug = this.slugDraft.trim().toLowerCase();
    if (!isValidSlug(slug)) {
      return;
    }
    this.publishingId = null;
    this.actions$.next({ kind: 'publish', id: item.id, slug });
  }

  get canConfirmPublish(): boolean {
    return isValidSlug(this.slugDraft.trim().toLowerCase());
  }

  confirmUnpublish(item: ApiStepsItem): void {
    if (
      typeof window !== 'undefined' &&
      window.confirm(`Unpublish “${item.title}”? It will no longer be on a public URL.`)
    ) {
      this.actions$.next({ kind: 'unpublish', id: item.id });
    }
  }

  isPublic(item: ApiStepsItem): boolean {
    return item.visibility.toLowerCase() === 'public';
  }

  publicHref(item: ApiStepsItem): string | null {
    return publicViewerPath(item);
  }

  copyPublicUrl(item: ApiStepsItem): void {
    const path = publicViewerPath(item);
    if (!path || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }
    void navigator.clipboard.writeText(`${window.location.origin}${path}`).then(() => {
      this.copiedId = item.id;
      if (this.copiedTimer) {
        clearTimeout(this.copiedTimer);
      }
      this.copiedTimer = setTimeout(() => {
        this.copiedId = null;
      }, 2000);
    });
  }

  private runAction(action: MyStepsAction): Observable<MyStepsView> {
    const request$ =
      action.kind === 'archive'
        ? this.myStepsApi.archive(action.id)
        : action.kind === 'publish'
          ? this.creatorSteps.publish(action.id, { slug: action.slug })
          : this.creatorSteps.unpublish(action.id);

    const message =
      action.kind === 'archive'
        ? 'Archived.'
        : action.kind === 'publish'
          ? 'Published.'
          : 'Unpublished.';

    return request$.pipe(
      switchMap(() => this.loadView(true, message)),
      startWith(emptyView({ loading: true })),
      catchError((err: unknown) =>
        this.loadView(true).pipe(
          map((view) => ({
            ...view,
            error: problemDetail(err, `Could not ${action.kind} Steps.`),
          })),
        ),
      ),
    );
  }

  private loadView(
    authenticated: boolean,
    actionMessage: string | null = null,
  ): Observable<MyStepsView> {
    if (!authenticated) {
      return of(emptyView({ authenticated: false }));
    }

    return combineLatest([
      this.myStepsApi.list(),
      this.platformAccounts.list().pipe(catchError(() => of([]))),
    ]).pipe(
      map(([items, accounts]): MyStepsView => {
        const canPublish = accounts.some(
          (account) => account.provider.toLowerCase() === 'tiktok' && account.isVerified,
        );
        return emptyView({
          items,
          canPublish,
          actionMessage,
        });
      }),
      startWith(emptyView({ loading: true })),
      catchError((err: unknown) =>
        of(emptyView({ error: problemDetail(err, 'Could not load My Steps.') })),
      ),
    );
  }
}
