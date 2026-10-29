import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

export interface AdminAnnouncementResponse {
  data: {
    recipientCount: number;
  };
}

@Injectable({ providedIn: 'root' })
export class AdminAnnouncementsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/admin/announcements`;

  publish(title: string, message: string) {
    return this.http.post<AdminAnnouncementResponse>(this.url, {
      title,
      message,
    });
  }
}
