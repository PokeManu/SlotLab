import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { allPages } from './all-pages';

export interface NotificationDto {
  id: number;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly http = inject(HttpClient);

  list() {
    return allPages<NotificationDto>(
      this.http,
      `${environment.apiUrl}/notifications`,
    ).pipe(map((response) => response.data));
  }

  markAllRead() {
    return this.http.patch<void>(
      `${environment.apiUrl}/notifications/read-all`,
      {},
    );
  }

  markRead(id: number) {
    return this.http.patch<{ data: { read: boolean } }>(
      `${environment.apiUrl}/notifications/${id}/read`,
      {},
    );
  }
}
