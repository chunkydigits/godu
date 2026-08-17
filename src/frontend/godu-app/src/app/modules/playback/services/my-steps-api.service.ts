import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiStepsItem,
  CreateStepsItemRequest,
  UpdateStepsItemRequest,
} from '../models/api-steps-item.model';
import { mapApiStepsItem } from '../models/api-steps-item.mapper';
import { StepsItem } from '../models/steps-item.model';

export interface TikTokVideoMetadata {
  caption: string;
  authorName?: string | null;
  authorUniqueId?: string | null;
  thumbnailUrl?: string | null;
  externalVideoId?: string | null;
  sourceUrl: string;
}

@Injectable({ providedIn: 'root' })
export class MyStepsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/me/steps`;
  private readonly tikTokBaseUrl = `${environment.apiBaseUrl}/api/me/tiktok`;

  list(includeArchived = false): Observable<ApiStepsItem[]> {
    return this.http.get<ApiStepsItem[]>(this.baseUrl, {
      params: { includeArchived },
    });
  }

  get(id: string): Observable<ApiStepsItem> {
    return this.http.get<ApiStepsItem>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  /** Domain-mapped get for playback. */
  getAsStepsItem(id: string): Observable<StepsItem> {
    return this.get(id).pipe(map(mapApiStepsItem));
  }

  create(request: CreateStepsItemRequest): Observable<ApiStepsItem> {
    return this.http.post<ApiStepsItem>(this.baseUrl, request);
  }

  update(id: string, request: UpdateStepsItemRequest): Observable<ApiStepsItem> {
    return this.http.put<ApiStepsItem>(`${this.baseUrl}/${encodeURIComponent(id)}`, request);
  }

  archive(id: string): Observable<ApiStepsItem> {
    return this.http.delete<ApiStepsItem>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  /** Official TikTok oEmbed metadata via Godu API proxy. */
  lookupTikTokMetadata(urlOrId: string): Observable<TikTokVideoMetadata> {
    return this.http.get<TikTokVideoMetadata>(`${this.tikTokBaseUrl}/oembed`, {
      params: { url: urlOrId },
    });
  }
}
