import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, Subject, catchError, map, merge, of, startWith, switchMap } from 'rxjs';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { CurrentUserService } from '../../../../core/auth/current-user.service';
import { problemDetail } from '../../../../core/http-problem';
import { MaterialModule } from '../../../../core/material.module';
import { AdminUser, UpdateAdminUserRequest } from '../../models/admin-user.model';
import { AdminUsersApiService } from '../../services/admin-users-api.service';

interface AdminDashboardView {
  loading: boolean;
  users: AdminUser[];
  error: string | null;
}

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [PageTemplateComponent, MaterialModule, RouterLink, AsyncPipe, DatePipe],
  templateUrl: './admin-dashboard-page.component.html',
  styleUrl: './admin-dashboard-page.component.scss',
})
export class AdminDashboardPageComponent {
  private readonly api = inject(AdminUsersApiService);
  private readonly currentUser = inject(CurrentUserService);
  private readonly reload$ = new Subject<void>();
  private readonly update$ = new Subject<{ id: string; request: UpdateAdminUserRequest }>();

  readonly me$ = this.currentUser.profile$;

  readonly view$: Observable<AdminDashboardView> = merge(
    this.reload$.pipe(
      startWith(undefined),
      switchMap(() => this.load()),
    ),
    this.update$.pipe(
      switchMap(({ id, request }) =>
        this.api.update(id, request).pipe(
          switchMap(() => {
            this.currentUser.refresh();
            return this.load();
          }),
          startWith(emptyView({ loading: true })),
          catchError((err: unknown) =>
            this.load().pipe(
              map((view) => ({
                ...view,
                error: problemDetail(err, 'Could not update user.'),
              })),
            ),
          ),
        ),
      ),
    ),
  );

  setAdmin(user: AdminUser, isAdmin: boolean): void {
    this.update$.next({ id: user.id, request: { isAdmin } });
  }

  setInternal(user: AdminUser, isInternal: boolean): void {
    this.update$.next({ id: user.id, request: { isInternal } });
  }

  private load(): Observable<AdminDashboardView> {
    return this.api.list().pipe(
      map(
        (users): AdminDashboardView => ({
          loading: false,
          users,
          error: null,
        }),
      ),
      startWith(emptyView({ loading: true })),
      catchError((err: unknown) =>
        of(emptyView({ error: problemDetail(err, 'Could not load users.') })),
      ),
    );
  }
}

function emptyView(overrides: Partial<AdminDashboardView> = {}): AdminDashboardView {
  return {
    loading: false,
    users: [],
    error: null,
    ...overrides,
  };
}
