import { allPages } from '../api/all-pages';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { finalize } from 'rxjs';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  bookOutline,
  checkmarkCircleOutline,
  desktopOutline,
  easelOutline,
  warningOutline,
} from 'ionicons/icons';
import { MobileNavigationComponent } from '../mobile-navigation/mobile-navigation.component';
import { TopbarComponent } from '../topbar-component/topbar-component.component';
import { NotificationState } from './notification-state';
type NotificationIcon =
  | 'book-outline'
  | 'checkmark-circle-outline'
  | 'desktop-outline'
  | 'easel-outline'
  | 'warning-outline';
type NotificationVariant = 'primary' | 'success' | 'warning' | 'neutral';
interface SlotNotification {
  id: number;
  title: string;
  context: string;
  message: string;
  time: string;
  icon: NotificationIcon;
  variant: NotificationVariant;
  read: boolean;
}
interface NotificationGroup {
  label: string;
  notifications: SlotNotification[];
}
@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  imports: [IonContent, IonIcon, TopbarComponent, MobileNavigationComponent],
})
export class NotificationsPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly notificationState = inject(NotificationState);
  loading = false;
  error = '';
  saving = false;
  notificationGroups: NotificationGroup[] = [];
  private hasEntered = false;
  ngOnInit(): void {
    this.loadNotifications();
  }
  ionViewDidEnter(): void {
    if (this.hasEntered) this.loadNotifications();
    this.hasEntered = true;
  }
  constructor() {
    addIcons({
      bookOutline,
      checkmarkCircleOutline,
      desktopOutline,
      easelOutline,
      warningOutline,
    });
  }
  loadNotifications(): void {
    this.loading = true;
    this.error = '';
    allPages<{
      id: number;
      type: string;
      title: string;
      message: string;
      createdAt: string;
      read: boolean;
    }>(this.http, `${environment.apiUrl}/notifications`)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const notifications = response.data.map((notification) => ({
            id: notification.id,
            title: notification.title,
            context: this.contextFor(notification.type),
            message: notification.message,
            time: new Date(notification.createdAt).toLocaleString('it-IT', {
              timeZone: 'Europe/Rome',
            }),
            icon: this.iconFor(notification.type),
            variant: this.variantFor(notification.type),
            read: notification.read,
          }));
          this.notificationGroups = notifications.length
            ? [{ label: 'Notifiche', notifications }]
            : [];
          this.notificationState.set(
            notifications.filter((notification) => !notification.read).length,
          );
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.notificationGroups = [];
          this.error = 'Impossibile caricare le notifiche. Riprova.';
          this.changeDetector.markForCheck();
        },
      });
  }
  private iconFor(type: string): NotificationIcon {
    if (type.includes('booking')) return 'book-outline';
    if (type.includes('report')) return 'warning-outline';
    if (type.includes('check_in')) return 'checkmark-circle-outline';
    return 'desktop-outline';
  }
  private contextFor(type: string): string {
    const labels: Record<string, string> = {
      booking_created: 'Prenotazione',
      booking_cancelled: 'Prenotazione cancellata',
      participant_added: 'Partecipazione',
      participant_removed: 'Partecipazione',
      space_unavailable: 'Spazio non disponibile',
      report_updated: 'Segnalazione',
      global_announcement: 'Avviso generale',
      check_in_completed: 'Check-in',
      check_in_expired: 'Check-in scaduto',
    };
    return labels[type] ?? 'Aggiornamento';
  }
  private variantFor(type: string): NotificationVariant {
    if (type.includes('cancelled') || type.includes('expired'))
      return 'warning';
    if (type.includes('created') || type.includes('updated')) return 'success';
    return 'neutral';
  }
  markAllAsRead(): void {
    if (this.saving) return;
    this.saving = true;
    this.error = '';
    this.http
      .patch<void>(`${environment.apiUrl}/notifications/read-all`, {})
      .pipe(
        finalize(() => {
          this.saving = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.notificationGroups.forEach((group) =>
            group.notifications.forEach((notification) => {
              notification.read = true;
            }),
          );
          this.notificationState.markAllRead();
        },
        error: () => {
          this.error = 'Impossibile segnare le notifiche come lette. Riprova.';
        },
      });
  }
  markAsRead(notification: SlotNotification): void {
    if (notification.read || this.saving) return;
    this.saving = true;
    this.error = '';
    this.http
      .patch<{
        data: {
          read: boolean;
        };
      }>(`${environment.apiUrl}/notifications/${notification.id}/read`, {})
      .pipe(
        finalize(() => {
          this.saving = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          notification.read = true;
          this.notificationState.markOneRead();
        },
        error: () => {
          this.error = 'Impossibile segnare la notifica come letta. Riprova.';
        },
      });
  }
}
