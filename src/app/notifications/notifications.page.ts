import { Component } from '@angular/core';
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
export class NotificationsPage{
readonly notificationGroups: NotificationGroup[] = [
  {
    label: 'Oggi',
    notifications: [
      {
        id: 1,
        title: 'Check-in disponibile',
        context: 'Aula Studio A3',
        message: 'E possibile effettuare il check-in fino alle 12:30.',
        time: '09:12',
        icon: 'book-outline',
        variant: 'primary',
        read: false,
      },
      {
        id: 2,
        title: 'Posto disponibile',
        context: 'Laboratorio web',
        message: 'Si è liberato un posto per oggi alle 11:00.',
        time: '08:47',
        icon: 'easel-outline',
        variant: 'success',
        read: false,
      },
      {
        id: 3,
        title: 'Prenotazione annullata',
        context: 'Sala Riunioni B',
        message: 'La tua prenotazione di ieri è stata annullata.',
        time: '08:15',
        icon: 'warning-outline',
        variant: 'warning',
        read: false,
      },
    ],
  },
  {
    label: 'Questa settimana',
    notifications: [
      {
        id: 4,
        title: 'Segnalazione aggiornata',
        context: 'Attrezzature',
        message: 'La tua segnalazione è stata presa in carico dal team.',
        time: 'Ieri',
        icon: 'desktop-outline',
        variant: 'neutral',
        read: false,
      },
      {
        id: 5,
        title: 'Prenotazione confermata',
        context: 'Aula Studio A2',
        message: 'La tua prenotazione di domani è stata confermata.',
        time: 'Lun',
        icon: 'checkmark-circle-outline',
        variant: 'success',
        read: true,
      },
    ],
  },
];

  constructor() {
      addIcons({
        bookOutline,
        checkmarkCircleOutline,
        desktopOutline,
        easelOutline,
        warningOutline,
      });
   }

   markAllAsRead(): void{
    for(const group of this.notificationGroups){
      for(const notification of group.notifications){
        notification.read = true;
      }
    }
   }

   markAsRead(notification: SlotNotification): void{
    notification.read = true;
   }
}
