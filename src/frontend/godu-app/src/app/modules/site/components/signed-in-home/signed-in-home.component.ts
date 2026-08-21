import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, catchError, map, of, startWith } from 'rxjs';
import { CurrentUserService } from '../../../../core/auth/current-user.service';
import { MaterialModule } from '../../../../core/material.module';
import { problemDetail } from '../../../../core/http-problem';
import { ApiStepsItem } from '../../../playback/models/api-steps-item.model';
import { PlayHistoryItem } from '../../../playback/models/play-history.model';
import { MyStepsApiService } from '../../../playback/services/my-steps-api.service';
import { PlayHistoryApiService } from '../../../playback/services/play-history-api.service';

interface LibraryView {
  loading: boolean;
  items: ApiStepsItem[];
  error: string | null;
}

interface HistoryView {
  loading: boolean;
  items: PlayHistoryItem[];
  error: string | null;
}

@Component({
  selector: 'app-signed-in-home',
  imports: [MaterialModule, RouterLink, AsyncPipe],
  templateUrl: './signed-in-home.component.html',
  styleUrl: './signed-in-home.component.scss',
})
export class SignedInHomeComponent {
  private readonly currentUser = inject(CurrentUserService);
  private readonly mySteps = inject(MyStepsApiService);
  private readonly playHistory = inject(PlayHistoryApiService);

  readonly profile$ = this.currentUser.profile$;
  readonly history$: Observable<HistoryView> = this.playHistory.list(8).pipe(
    map((items) => ({ loading: false, items, error: null })),
    startWith({ loading: true, items: [], error: null }),
    catchError((err: unknown) =>
      of({
        loading: false,
        items: [],
        error: problemDetail(err, 'Could not load Godu’d history.'),
      }),
    ),
  );
  readonly library$: Observable<LibraryView> = this.mySteps.list().pipe(
    map((items) => ({
      loading: false,
      items: items.slice(0, 3),
      error: null,
    })),
    startWith({ loading: true, items: [], error: null }),
    catchError((err: unknown) =>
      of({
        loading: false,
        items: [],
        error: problemDetail(err, 'Could not load your Steps.'),
      }),
    ),
  );

  sourceLabel(source: string): string {
    switch (source) {
      case 'demo':
        return 'Demo';
      case 'library':
        return 'Yours';
      default:
        return 'Creator';
    }
  }
}
