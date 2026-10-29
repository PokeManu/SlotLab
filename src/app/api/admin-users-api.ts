import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

export interface AdminUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface AdminUsersPageResponse {
  data: AdminUser[];
  pagination: { totalPages: number };
}

@Injectable({ providedIn: 'root' })
export class AdminUsersApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/admin/users`;

  list(page: number, search: string) {
    const params = new URLSearchParams({ page: String(page), size: '20' });
    if (search.trim()) params.set('search', search.trim());
    return this.http.get<AdminUsersPageResponse>(`${this.url}?${params}`);
  }

  remove(id: number) {
    return this.http.delete(`${this.url}/${id}`);
  }
}
