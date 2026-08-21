import { AsyncPipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, startWith, switchMap } from 'rxjs';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { problemDetail } from '../../../../core/http-problem';
import { MaterialModule } from '../../../../core/material.module';
import {
  AnalyticsDailyPoint,
  AnalyticsFunnelStep,
  AnalyticsSummary,
} from '../../models/analytics-summary.model';
import { AdminAnalyticsApiService } from '../../services/admin-analytics-api.service';

export type AnalyticsRangeDays = 7 | 30 | 90;

interface AnalyticsView {
  loading: boolean;
  days: AnalyticsRangeDays;
  summary: AnalyticsSummary | null;
  error: string | null;
}

@Component({
  selector: 'app-admin-analytics-page',
  imports: [PageTemplateComponent, MaterialModule, AsyncPipe, DecimalPipe],
  templateUrl: './admin-analytics-page.component.html',
  styleUrl: './admin-analytics-page.component.scss',
})
export class AdminAnalyticsPageComponent {
  private readonly api = inject(AdminAnalyticsApiService);
  private readonly days$ = new BehaviorSubject<AnalyticsRangeDays>(30);

  readonly ranges: AnalyticsRangeDays[] = [7, 30, 90];

  readonly view$: Observable<AnalyticsView> = this.days$.pipe(
    switchMap((days) => {
      const to = new Date();
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
      return this.api.summary(from, to).pipe(
        map(
          (summary): AnalyticsView => ({
            loading: false,
            days,
            summary,
            error: null,
          }),
        ),
        startWith(emptyView({ loading: true, days })),
        catchError((err: unknown) =>
          of(
            emptyView({
              days,
              error: problemDetail(err, 'Could not load analytics.'),
            }),
          ),
        ),
      );
    }),
  );

  selectRange(days: AnalyticsRangeDays): void {
    this.days$.next(days);
  }

  barHeight(value: number, summary: AnalyticsSummary): string {
    const max = dailyMax(summary);
    return `${Math.round((value / max) * 100)}%`;
  }

  funnelWidth(step: AnalyticsFunnelStep): string {
    return `${Math.max(step.conversionFromStart, step.count > 0 ? 4 : 0)}%`;
  }

  dayLabel(point: AnalyticsDailyPoint): string {
    return point.date.slice(5);
  }
}

function dailyMax(summary: AnalyticsSummary): number {
  const values = summary.daily.flatMap((point) => [
    point.visitors,
    point.godusCreated,
    point.godusStarted,
    point.godusCompleted,
  ]);
  return Math.max(1, ...values);
}

function emptyView(overrides: Partial<AnalyticsView> = {}): AnalyticsView {
  return {
    loading: false,
    days: 30,
    summary: null,
    error: null,
    ...overrides,
  };
}
