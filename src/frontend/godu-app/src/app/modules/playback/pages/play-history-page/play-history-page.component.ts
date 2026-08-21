import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, catchError, map, of, startWith } from 'rxjs';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { MaterialModule } from '../../../../core/material.module';
import { problemDetail } from '../../../../core/http-problem';
import { PlayHistoryItem } from '../../models/play-history.model';
import { PlayHistoryApiService } from '../../services/play-history-api.service';

interface HistoryView {
  loading: boolean;
  items: PlayHistoryItem[];
  error: string | null;
}

@Component({
  selector: 'app-play-history-page',
  imports: [PageTemplateComponent, MaterialModule, RouterLink, AsyncPipe],
  templateUrl: './play-history-page.component.html',
  styleUrl: './play-history-page.component.scss',
})
export class PlayHistoryPageComponent {
  private readonly playHistory = inject(PlayHistoryApiService);

  readonly view$: Observable<HistoryView> = this.playHistory.list(100).pipe(
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
