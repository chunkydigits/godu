import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { UpdateUserSettingsRequest, UserSettings } from '../models/user-settings.model';

@Injectable({ providedIn: 'root' })
export class UserSettingsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/me/settings`;

  get(): Observable<UserSettings> {
    return this.http.get<UserSettings>(this.baseUrl);
  }

  update(request: UpdateUserSettingsRequest): Observable<UserSettings> {
    return this.http.put<UserSettings>(this.baseUrl, request);
  }
}
