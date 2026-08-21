import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AnalyticsSummary } from '../models/analytics-summary.model';

@Injectable({ providedIn: 'root' })
export class AdminAnalyticsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/admin/analytics`;

  summary(from: Date, to: Date): Observable<AnalyticsSummary> {
    const params = new HttpParams()
      .set('from', from.toISOString())
      .set('to', to.toISOString());
    return this.http.get<AnalyticsSummary>(`${this.baseUrl}/summary`, { params });
  }
}
