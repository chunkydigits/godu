import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { publicAlias } from '../../playback/models/public-path';
import { CreatorProfile } from '../models/creator-profile.model';

@Injectable({ providedIn: 'root' })
export class CreatorProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/public`;

  get(userId: string): Observable<CreatorProfile> {
    return this.http.get<CreatorProfile>(
      `${this.baseUrl}/creators/${encodeURIComponent(userId)}`,
    );
  }

  getByHandle(provider: string, username: string): Observable<CreatorProfile> {
    const alias = publicAlias(provider);
    return this.http.get<CreatorProfile>(
      `${this.baseUrl}/${encodeURIComponent(alias)}/${encodeURIComponent(username)}`,
    );
  }
}
