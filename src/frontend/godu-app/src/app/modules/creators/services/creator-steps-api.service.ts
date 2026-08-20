import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiStepsItem } from '../../playback/models/api-steps-item.model';

export interface PublishStepsRequest {
  slug: string;
  linkedPlatformAccountId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CreatorStepsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/creator/steps`;

  list(): Observable<ApiStepsItem[]> {
    return this.http.get<ApiStepsItem[]>(this.baseUrl);
  }

  publish(id: string, request: PublishStepsRequest): Observable<ApiStepsItem> {
    return this.http.post<ApiStepsItem>(
      `${this.baseUrl}/${encodeURIComponent(id)}/publish`,
      request,
    );
  }

  unpublish(id: string): Observable<ApiStepsItem> {
    return this.http.post<ApiStepsItem>(
      `${this.baseUrl}/${encodeURIComponent(id)}/unpublish`,
      {},
    );
  }
}
