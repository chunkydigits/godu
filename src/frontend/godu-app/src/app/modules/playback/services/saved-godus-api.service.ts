import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SaveGoduRequest, SavedGoduItem } from '../models/saved-godu.model';
import { GoduPlaybackSettings } from '../models/godu-playback-settings';

@Injectable({ providedIn: 'root' })
export class SavedGodusApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/me/saved-godus`;

  list(take = 100): Observable<SavedGoduItem[]> {
    return this.http.get<SavedGoduItem[]>(this.url, { params: { take } });
  }

  save(request: SaveGoduRequest): Observable<SavedGoduItem> {
    return this.http.post<SavedGoduItem>(this.url, request);
  }

  remove(goduId: string): Observable<void> {
    return this.http
      .delete(`${this.url}/${encodeURIComponent(goduId)}`, { observe: 'response' })
      .pipe(map(() => undefined));
  }

  updateSettings(goduId: string, userSettings: GoduPlaybackSettings): Observable<SavedGoduItem> {
    return this.http.put<SavedGoduItem>(
      `${this.url}/${encodeURIComponent(goduId)}/settings`,
      { userSettings },
    );
  }
}
