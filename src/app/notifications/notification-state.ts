import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { allPages } from '../api/all-pages';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationState {
  private readonly http = inject(HttpClient);
  private readonly unread = signal(0);
  readonly unreadCount = this.unread.asReadonly();

  refresh(): void {
    allPages<{ read: boolean }>(this.http, `${environment.apiUrl}/notifications`).subscribe({
      next: response => this.set(response.data.filter(item => !item.read).length),
      error: () => {},
    });
  }

  set(count: number): void { this.unread.set(Math.max(0, count)); }
  markOneRead(): void { this.unread.update(count => Math.max(0, count - 1)); }
  markAllRead(): void { this.unread.set(0); }
}
