import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, Subject, catchError, map, merge, of, startWith, switchMap } from 'rxjs';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { problemDetail } from '../../../../core/http-problem';
import { MaterialModule } from '../../../../core/material.module';
import { ApiStepsItem } from '../../../playback/models/api-steps-item.model';
import { publicViewerPath } from '../../../playback/models/public-path';
import { CreatorStepsApiService } from '../../services/creator-steps-api.service';

interface CreatorDashboardView {
  loading: boolean;
  items: ApiStepsItem[];
  error: string | null;
  actionMessage: string | null;
}

@Component({
  selector: 'app-creator-dashboard-page',
  imports: [PageTemplateComponent, MaterialModule, RouterLink, AsyncPipe],
  templateUrl: './creator-dashboard-page.component.html',
  styleUrl: './creator-dashboard-page.component.scss',
})
export class CreatorDashboardPageComponent {
  private readonly api = inject(CreatorStepsApiService);
  private readonly reload$ = new Subject<string | null>();
  private readonly unpublishId$ = new Subject<string>();

  copiedId: string | null = null;
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  readonly view$: Observable<CreatorDashboardView> = merge(
    this.reload$.pipe(
      startWith(null),
      switchMap((message) => this.loadView(message)),
    ),
    this.unpublishId$.pipe(
      switchMap((id) =>
        this.api.unpublish(id).pipe(
          switchMap(() => this.loadView('Unpublished.')),
          startWith(emptyView({ loading: true })),
          catchError((err: unknown) =>
            this.loadView().pipe(
              map((view) => ({
                ...view,
                error: problemDetail(err, 'Could not unpublish Steps.'),
              })),
            ),
          ),
        ),
      ),
    ),
  );

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

  confirmUnpublish(item: ApiStepsItem): void {
    if (
      typeof window !== 'undefined' &&
      window.confirm(`Unpublish “${item.title}”? It will no longer be on a public URL.`)
    ) {
      this.unpublishId$.next(item.id);
    }
  }

  private loadView(actionMessage: string | null = null): Observable<CreatorDashboardView> {
    return this.api.list().pipe(
      map(
        (items): CreatorDashboardView => ({
          loading: false,
          items,
          error: null,
          actionMessage,
        }),
      ),
      startWith(emptyView({ loading: true })),
      catchError((err: unknown) =>
        of(emptyView({ error: problemDetail(err, 'Could not load published Steps.') })),
      ),
    );
  }
}

function emptyView(overrides: Partial<CreatorDashboardView> = {}): CreatorDashboardView {
  return {
    loading: false,
    items: [],
    error: null,
    actionMessage: null,
    ...overrides,
  };
}
