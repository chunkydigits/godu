import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  LinkedPlatformAccount,
  PlatformConnectStart,
} from '../models/linked-platform-account.model';

@Injectable({ providedIn: 'root' })
export class PlatformAccountsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/me/platform-accounts`;

  list(): Observable<LinkedPlatformAccount[]> {
    return this.http.get<LinkedPlatformAccount[]>(this.baseUrl);
  }

  startConnect(provider: string): Observable<PlatformConnectStart> {
    return this.http.post<PlatformConnectStart>(
      `${this.baseUrl}/${encodeURIComponent(provider)}/connect`,
      {},
    );
  }

  disconnect(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }
}
