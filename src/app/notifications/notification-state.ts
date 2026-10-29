import { Injectable, inject, signal } from '@angular/core';
import { NotificationsApi } from '../api/notifications-api';
import { Auth } from '../auth/auth';
import { Subscription } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class NotificationState {
  private readonly notificationsApi = inject(NotificationsApi);
  private readonly auth = inject(Auth);
  private readonly unread = signal(0);
  readonly unreadCount = this.unread.asReadonly();
  private refreshRequest?: Subscription;
  refresh(): void {
    this.refreshRequest?.unsubscribe();
    const userId = this.auth.user()?.id;
    const sessionVersion = this.auth.sessionVersion;
    this.refreshRequest = this.notificationsApi.list().subscribe({
      next: (notifications) => {
        if (
          this.auth.user()?.id !== userId ||
          this.auth.sessionVersion !== sessionVersion
        ) return;
        this.set(notifications.filter((item) => !item.read).length);
      },
      error: () => {},
    });
  }
  set(count: number): void {
    this.unread.set(Math.max(0, count));
  }
  markOneRead(): void {
    this.unread.update((count) => Math.max(0, count - 1));
  }
  markAllRead(): void {
    this.unread.set(0);
  }
}
