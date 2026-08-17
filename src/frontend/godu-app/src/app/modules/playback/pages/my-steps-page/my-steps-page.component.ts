import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import {
  BehaviorSubject,
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
import { MaterialModule } from '../../../../core/material.module';
import { ApiStepsItem } from '../../models/api-steps-item.model';
import { MyStepsApiService } from '../../services/my-steps-api.service';

interface MyStepsView {
  authenticated: boolean;
  loading: boolean;
  items: ApiStepsItem[];
  error: string | null;
  actionMessage: string | null;
}

@Component({
  selector: 'app-my-steps-page',
  imports: [PageTemplateComponent, MaterialModule, RouterLink, AsyncPipe],
  templateUrl: './my-steps-page.component.html',
  styleUrl: './my-steps-page.component.scss',
})
export class MyStepsPageComponent {
  private readonly auth = inject(AuthService);
  private readonly myStepsApi = inject(MyStepsApiService);

  private readonly reload$ = new BehaviorSubject<number>(0);
  private readonly archiveId$ = new Subject<string>();

  readonly isAuthenticated$ = this.auth.isAuthenticated$;

  readonly view$: Observable<MyStepsView> = merge(
    combineLatest([this.auth.isAuthenticated$, this.reload$]).pipe(
      switchMap(([authenticated]) => this.loadView(authenticated)),
    ),
    this.archiveId$.pipe(
      switchMap((id) =>
        this.myStepsApi.archive(id).pipe(
          switchMap(() =>
            this.myStepsApi.list().pipe(
              map(
                (items): MyStepsView => ({
                  authenticated: true,
                  loading: false,
                  items,
                  error: null,
                  actionMessage: 'Archived.',
                }),
              ),
            ),
          ),
          catchError((err: Error) =>
            of({
              authenticated: true,
              loading: false,
              items: [] as ApiStepsItem[],
              error: err.message || 'Could not archive Steps.',
              actionMessage: null,
            }),
          ),
          startWith({
            authenticated: true,
            loading: true,
            items: [] as ApiStepsItem[],
            error: null,
            actionMessage: null,
          }),
        ),
      ),
    ),
  );

  confirmArchive(item: ApiStepsItem): void {
    if (typeof window !== 'undefined' && window.confirm(`Archive “${item.title}”?`)) {
      this.archiveId$.next(item.id);
    }
  }

  private loadView(authenticated: boolean): Observable<MyStepsView> {
    if (!authenticated) {
      return of({
        authenticated: false,
        loading: false,
        items: [],
        error: null,
        actionMessage: null,
      });
    }

    return this.myStepsApi.list().pipe(
      map(
        (items): MyStepsView => ({
          authenticated: true,
          loading: false,
          items,
          error: null,
          actionMessage: null,
        }),
      ),
      startWith({
        authenticated: true,
        loading: true,
        items: [] as ApiStepsItem[],
        error: null,
        actionMessage: null,
      }),
      catchError((err: Error) =>
        of({
          authenticated: true,
          loading: false,
          items: [] as ApiStepsItem[],
          error: err.message || 'Could not load My Steps.',
          actionMessage: null,
        }),
      ),
    );
  }
}
