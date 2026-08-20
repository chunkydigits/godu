import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiStepsItem } from '../models/api-steps-item.model';
import { mapApiStepsItem } from '../models/api-steps-item.mapper';
import { publicAlias } from '../models/public-path';
import { StepsItem } from '../models/steps-item.model';

@Injectable({ providedIn: 'root' })
export class PublicStepsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/public`;

  get(provider: string, username: string, slug: string): Observable<ApiStepsItem> {
    return this.http.get<ApiStepsItem>(this.itemUrl(provider, username, slug));
  }

  getAsStepsItem(provider: string, username: string, slug: string): Observable<StepsItem> {
    return this.get(provider, username, slug).pipe(map(mapApiStepsItem));
  }

  getRelated(provider: string, username: string, slug: string): Observable<ApiStepsItem[]> {
    return this.http.get<ApiStepsItem[]>(`${this.itemUrl(provider, username, slug)}/related`);
  }

  getRelatedAsStepsItems(
    provider: string,
    username: string,
    slug: string,
  ): Observable<StepsItem[]> {
    return this.getRelated(provider, username, slug).pipe(
      map((items) => items.map(mapApiStepsItem)),
    );
  }

  private itemUrl(provider: string, username: string, slug: string): string {
    const alias = publicAlias(provider);
    return `${this.baseUrl}/${encodeURIComponent(alias)}/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
  }
}
