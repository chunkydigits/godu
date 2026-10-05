import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreatorProfile, ProfileLink, UpdateCreatorProfileRequest } from '../models/creator-profile.model';

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

  addLink(title: string, url: string): Observable<ProfileLink> {
    return this.http.post<ProfileLink>(`${this.baseUrl}/links`, { title, url });
  }

  updateLink(id: string, title: string, url: string): Observable<ProfileLink> {
    return this.http.put<ProfileLink>(`${this.baseUrl}/links/${encodeURIComponent(id)}`, { title, url });
  }

  deleteLink(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/links/${encodeURIComponent(id)}`);
  }

  reorderLinks(linkIds: string[]): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/links/order`, { linkIds });
  }
}
