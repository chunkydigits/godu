import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AdminUser, UpdateAdminUserRequest } from '../models/admin-user.model';

@Injectable({ providedIn: 'root' })
export class AdminUsersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/admin/users`;

  list(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(this.baseUrl);
  }

  update(id: string, request: UpdateAdminUserRequest): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.baseUrl}/${encodeURIComponent(id)}`, request);
  }
}
