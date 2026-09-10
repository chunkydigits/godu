import { Injectable, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import {
  BehaviorSubject,
  Observable,
  catchError,
  combineLatest,
  concatMap,
  distinctUntilChanged,
  forkJoin,
  filter,
  from,
  map,
  of,
  reduce,
  switchMap,
  tap,
} from 'rxjs';
import { CreatorProfileApiService } from '../../creators/services/creator-profile-api.service';
import { CreatorStepsApiService } from '../../creators/services/creator-steps-api.service';
import { StepsVisibility } from '../models/steps-visibility.enum';
import {
  associatedGoduImportMessage,
  planAssociatedGoduImport,
  tiktokHandlesForAccount,
} from '../models/associated-godu-import';
import { AnalyticsEvent } from '../../../core/analytics/analytics-event';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { PRESET_GODU_CATEGORIES, mergeGoduCategories } from '../models/godu-categories';
import { SaveGoduRequest, SavedGoduItem } from '../models/saved-godu.model';
import { GoduPlaybackSettings } from '../models/godu-playback-settings';
import { DemoStepsService } from './demo-steps.service';
import { SavedGodusApiService } from './saved-godus-api.service';

@Injectable({ providedIn: 'root' })
export class SavedGodusService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(SavedGodusApiService);
  private readonly demos = inject(DemoStepsService);
  private readonly creatorProfiles = inject(CreatorProfileApiService);
  private readonly creatorSteps = inject(CreatorStepsApiService);
  private readonly analytics = inject(AnalyticsService);
  private readonly itemsSubject = new BehaviorSubject<SavedGoduItem[]>([]);
  private readonly hydratedSubject = new BehaviorSubject(false);
  private started = false;

  readonly items$ = this.itemsSubject.asObservable();
  readonly hydrated$ = this.hydratedSubject.asObservable();
  readonly categories$: Observable<string[]> = combineLatest([
    this.demos.list().pipe(catchError(() => of([]))),
    this.items$,
  ]).pipe(
    map(([demos, items]) =>
      mergeGoduCategories(
        [...PRESET_GODU_CATEGORIES, ...demos.map((demo) => demo.category)],
        items.map((item) => item.category),
      ),
    ),
  );

  initialize(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    this.auth.isAuthenticated$.pipe(distinctUntilChanged()).subscribe((authenticated) => {
      if (!authenticated) {
        this.itemsSubject.next([]);
        this.hydratedSubject.next(true);
        return;
      }

      this.hydratedSubject.next(false);
      this.refresh();
    });
  }

  isSaved$(goduId: string): Observable<boolean> {
    return this.items$.pipe(map((items) => items.some((item) => item.goduId === goduId)));
  }

  settings$(goduId: string): Observable<GoduPlaybackSettings | null> {
    return combineLatest([this.hydrated$, this.items$]).pipe(
      filter(([hydrated]) => hydrated),
      map(([, items]) => items.find((item) => item.goduId === goduId)?.userSettings ?? null),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    );
  }

  item$(goduId: string): Observable<SavedGoduItem | null> {
    return combineLatest([this.hydrated$, this.items$]).pipe(
      filter(([hydrated]) => hydrated),
      map(([, items]) => items.find((item) => item.goduId === goduId) ?? null),
      distinctUntilChanged((a, b) => a?.goduId === b?.goduId && JSON.stringify(a?.userSettings) === JSON.stringify(b?.userSettings)),
    );
  }

  updateSettings(goduId: string, settings: GoduPlaybackSettings): Observable<SavedGoduItem> {
    return this.api.updateSettings(goduId, settings).pipe(
      tap((saved) => this.itemsSubject.next(
        this.itemsSubject.value.map((item) => item.goduId === goduId ? saved : item),
      )),
    );
  }

  save(request: SaveGoduRequest): Observable<SavedGoduItem> {
    return this.api.save(request).pipe(
      map((saved) => {
        const next = [
          saved,
          ...this.itemsSubject.value.filter((item) => item.goduId !== saved.goduId),
        ];
        this.itemsSubject.next(next);
        this.analytics.track(AnalyticsEvent.GoduBookmarked, { goduId: saved.goduId });
        return saved;
      }),
    );
  }

  remove(goduId: string): Observable<void> {
    return this.api.remove(goduId).pipe(
      tap(() => {
        this.itemsSubject.next(
          this.itemsSubject.value.filter((item) => item.goduId !== goduId),
        );
        this.analytics.track(AnalyticsEvent.GoduBookmarkRemoved, { goduId });
      }),
    );
  }

  importAssociatedFromTikTok(account: {
    username: string;
    usernameAliases?: string[] | null;
    displayName?: string | null;
  }): Observable<{ found: number; imported: number; message: string }> {
    const handles = tiktokHandlesForAccount(account);
    const username = handles[0] ?? account.username;
    const alreadySavedIds = new Set(this.itemsSubject.value.map((item) => item.goduId));

    return forkJoin({
      profile: this.creatorProfiles.getByHandle('tiktok', username).pipe(catchError(() => of(null))),
      mine: this.creatorSteps.list().pipe(catchError(() => of([]))),
      demos: this.demos.list().pipe(catchError(() => of([]))),
    }).pipe(
      switchMap(({ profile, mine, demos }) => {
        const published = [
          ...(profile?.publishedSteps ?? []),
          ...mine
            .filter((item) => item.visibility.toLowerCase() === StepsVisibility.Public)
            .map((item) => ({
              id: item.id,
              title: item.title,
              slug: item.slug,
              provider: item.video.provider,
              username: item.video.creatorUsername,
              publicPath: item.publicPath,
              creatorDisplayName: item.creatorDisplayName,
            })),
        ];
        const plan = planAssociatedGoduImport({
          handles,
          published,
          demos,
          alreadySavedIds,
          creatorDisplayName: profile?.displayName ?? account.displayName ?? null,
        });

        if (plan.toImport.length === 0) {
          return of({
            found: plan.found,
            imported: 0,
            message: associatedGoduImportMessage(account.username, plan.found, 0),
          });
        }

        return from(plan.toImport).pipe(
          concatMap((request) =>
            this.save(request).pipe(
              map(() => true),
              catchError(() => of(false)),
            ),
          ),
          reduce((imported, ok) => imported + (ok ? 1 : 0), 0),
          map((imported) => ({
            found: plan.found,
            imported,
            message: associatedGoduImportMessage(account.username, plan.found, imported),
          })),
        );
      }),
    );
  }

  private refresh(): void {
    this.api
      .list()
      .pipe(catchError(() => of([])))
      .subscribe((items) => {
        this.itemsSubject.next(items);
        this.hydratedSubject.next(true);
      });
  }
}
