import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';

  import {
    barChartOutline,
    bookOutline,
    businessOutline,
    calendarClearOutline,
    calendarOutline,
    checkboxOutline,
    desktopOutline,
    gridOutline,
    printOutline,
    searchOutline,
    warningOutline,
    constructOutline,
  } from 'ionicons/icons';

  interface NavigationItem{
    label: string;
    icon: string;
    active: boolean;
    route: string;
  }

  interface AdminBooking{
    time: string;
    name: string;
    building: string;
    details: string;
    status: string;
  }

  interface SpaceStatus{
    icon: string;
    name: string;
    details: string;
    tone: 'available' | 'warning';
  }

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  imports: [IonContent, IonIcon, RouterLink],
})
export class AdminDashboardPage{
  readonly navigationItems: NavigationItem[] = [
    {
      label: 'Panoramica',
      icon: 'grid-outline',
      active: true,
      route: '/admin'
    },
    {
      label: 'Prenotazioni',
      icon: 'calendar-outline',
      active: false,
      route: '/admin/bookings'
    },
    {
      label: 'Spazi',
      icon: 'business-outline',
      active: false,
      route: '/admin/spaces'
    },
    {
      label: 'Segnalazioni',
      icon: 'construct-outline',
      active: false,
      route: '/admin/reports'
    },
    {
      label: 'Statistiche',
      icon: 'bar-chart-outline',
      active: false,
      route: 'admin/statistics'
    },
  ];

  readonly bookings: AdminBooking[] = [
    {
      time: '09:00',
      name: 'Aula Studio A1',
      building: 'Edificio 6',
      details: '12 partecipanti',
      status: 'Confermata',
    },
    {
      time: '10:30',
      name: 'Laboratorio Reti',
      building: 'Edificio 9',
      details: 'Docente + 18 studenti',
      status: 'Check-in',
    },
    {
      time: '12:00',
      name: 'Sala Riunioni B',
      building: 'Edificio 6',
      details: 'Proiettore richiesto',
      status: 'Confermata',
    },
    {
      time: '14:30',
      name: 'Postazione 3D-02',
      building: 'FabLab',
      details: '1 partecipante',
      status: 'Confermata',
    },
  ];

  readonly spaceStatuses: SpaceStatus[] = [
    {
      icon: 'book-outline',
      name: 'Aule studio',
      details: '8 disponibili',
      tone: 'available',
    },
    {
      icon: 'desktop-outline',
      name: 'Laboratori',
      details: '4 disponibili',
      tone: 'available',
    },
    {
      icon: 'business-outline',
      name: 'Sale riunioni',
      details: '2 quasi complete',
      tone: 'warning',
    },
    {
      icon: 'print-outline',
      name: 'Attrezzature',
      details: '3 in manutenzione',
      tone: 'warning',
    },
  ];

  constructor() {
      addIcons({
        barChartOutline,
        bookOutline,
        businessOutline,
        calendarClearOutline,
        calendarOutline,
        checkboxOutline,
        desktopOutline,
        gridOutline,
        printOutline,
        searchOutline,
        warningOutline,
        constructOutline,
      });
   }

}
