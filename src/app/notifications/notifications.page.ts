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

type NotificationIcon = | 'book-outline' | 'checkmark-circle-outline' | 'desktop-outline' | 'easel-outline' | 'warning-outline';
type NotificationVariant = | 'primary' | 'success' | 'warning' | 'neutral';

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

interface NotificationGroup{
  label: string;
  notifications: SlotNotification[];
}

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  imports: [IonContent, IonIcon, TopbarComponent, MobileNavigationComponent],
})
export class NotificationsPage implements OnInit{
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  loading = false;
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

   private loadNotifications(): void {
    this.loading = true;
    this.http.get<{ data: Array<{ id: number; type: string; title: string; message: string; createdAt: string; read: boolean }> }>(
      `${environment.apiUrl}/notifications`,
    ).pipe(finalize(() => { this.loading = false; })).subscribe({
      next: response => {
        const notifications = response.data.map(notification => ({
          id: notification.id,
          title: notification.title,
          context: notification.type,
          message: notification.message,
          time: new Date(notification.createdAt).toLocaleString('it-IT'),
          icon: this.iconFor(notification.type),
          variant: this.variantFor(notification.type),
          read: notification.read,
        }));
        this.notificationGroups = notifications.length ? [{ label: 'Notifiche', notifications }] : [];
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.notificationGroups = [];
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

   private variantFor(type: string): NotificationVariant {
    if (type.includes('cancelled') || type.includes('expired')) return 'warning';
    if (type.includes('created') || type.includes('updated')) return 'success';
    return 'neutral';
   }

   markAllAsRead(): void{
    this.http.patch<void>(`${environment.apiUrl}/notifications/read-all`, {}).subscribe({
      next: () => this.notificationGroups.forEach(group => group.notifications.forEach(notification => { notification.read = true; })),
    });
   }

   markAsRead(notification: SlotNotification): void{
    if (notification.read) return;
    this.http.patch<{ data: { read: boolean } }>(`${environment.apiUrl}/notifications/${notification.id}/read`, {}).subscribe({
      next: () => { notification.read = true; },
    });
   }
}
