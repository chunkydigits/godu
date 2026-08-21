import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PlayHistoryItem, RecordPlayHistoryRequest } from '../models/play-history.model';

@Injectable({ providedIn: 'root' })
export class PlayHistoryApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/me/play-history`;

  list(take = 50): Observable<PlayHistoryItem[]> {
    return this.http.get<PlayHistoryItem[]>(this.url, { params: { take } });
  }

  record(request: RecordPlayHistoryRequest): Observable<PlayHistoryItem> {
    return this.http.post<PlayHistoryItem>(this.url, request);
  }
}
