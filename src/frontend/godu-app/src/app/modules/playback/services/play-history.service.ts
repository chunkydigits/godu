import { Injectable, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { EMPTY, catchError, concatMap, distinctUntilChanged, filter, from, of, take, tap } from 'rxjs';
import { DemoStepsService } from './demo-steps.service';
import { PlayHistoryApiService } from './play-history-api.service';
import {
  PlayHistoryEventName,
  toRecordPlayHistoryRequest,
} from '../models/play-history.model';
import { StepsItem } from '../models/steps-item.model';
import {
  loadLocalPlayHistory,
  removeLocalPlayHistory,
  upsertLocalPlayHistory,
} from '../models/play-history-local';

@Injectable({ providedIn: 'root' })
export class PlayHistoryService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(PlayHistoryApiService);
  private readonly demos = inject(DemoStepsService);
  private started = false;

  initialize(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    this.auth.isAuthenticated$.pipe(distinctUntilChanged(), filter(Boolean)).subscribe(() => {
      this.flushLocal();
    });
  }

  record(item: StepsItem, event: PlayHistoryEventName): void {
    const request = toRecordPlayHistoryRequest(item, event, this.demos.isDemo(item.id));
    this.auth.isAuthenticated$.pipe(take(1)).subscribe((authenticated) => {
      if (authenticated) {
        this.api.record(request).pipe(catchError(() => EMPTY)).subscribe();
        return;
      }

      upsertLocalPlayHistory(request, new Date().toISOString());
    });
  }

  private flushLocal(): void {
    const pending = loadLocalPlayHistory();
    if (pending.length === 0) {
      return;
    }

    from(pending)
      .pipe(
        concatMap((item) => {
          const started = this.api.record({
            goduId: item.goduId,
            title: item.title,
            creatorDisplayName: item.creatorDisplayName,
            playPath: item.playPath,
            source: item.source,
            event: 'started',
          });
          if (item.completedCount <= 0) {
            return started.pipe(
              tap(() => removeLocalPlayHistory(item.goduId)),
              catchError(() => of(null)),
            );
          }

          return started.pipe(
            concatMap(() =>
              this.api.record({
                goduId: item.goduId,
                title: item.title,
                creatorDisplayName: item.creatorDisplayName,
                playPath: item.playPath,
                source: item.source,
                event: 'completed',
              }),
            ),
            tap(() => removeLocalPlayHistory(item.goduId)),
            catchError(() => of(null)),
          );
        }),
      )
      .subscribe();
  }
}
