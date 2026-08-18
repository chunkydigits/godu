import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreatorProfile } from '../models/creator-profile.model';

@Injectable({ providedIn: 'root' })
export class CreatorProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/public/creators`;

  get(userId: string): Observable<CreatorProfile> {
    return this.http.get<CreatorProfile>(`${this.baseUrl}/${encodeURIComponent(userId)}`);
  }
}
