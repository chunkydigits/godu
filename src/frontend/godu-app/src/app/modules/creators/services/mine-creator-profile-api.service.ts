import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreatorProfile, UpdateCreatorProfileRequest } from '../models/creator-profile.model';

@Injectable({ providedIn: 'root' })
export class MineCreatorProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/creator/profile`;

  get(): Observable<CreatorProfile> {
    return this.http.get<CreatorProfile>(this.baseUrl);
  }

  update(request: UpdateCreatorProfileRequest): Observable<CreatorProfile> {
    return this.http.patch<CreatorProfile>(this.baseUrl, request);
  }

  importFromSocial(): Observable<CreatorProfile> {
    return this.http.post<CreatorProfile>(`${this.baseUrl}/from-social`, {});
  }
}
