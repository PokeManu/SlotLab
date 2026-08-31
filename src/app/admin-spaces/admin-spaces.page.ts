import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';

  import {
    addOutline,
    barChartOutline,
    bookOutline,
    businessOutline,
    calendarOutline,
    checkboxOutline,
    chevronBackOutline,
    chevronDownOutline,
    chevronForwardOutline,
    constructOutline,
    createOutline,
    desktopOutline,
    ellipsisVerticalOutline,
    gridOutline,
    searchOutline
  } from 'ionicons/icons';

  interface NavigationItem{
    label:string;
    icon:string;
    active:boolean;
    route: string;
  }

  interface AdminSpace{
    name: string;
    icon: string;
    building: string,
    capacity: number,
    status: 'available' | 'in-use' | 'maintenance';
    statusLabel: string;
  }


@Component({
  selector: 'app-admin-spaces',
  templateUrl: './admin-spaces.page.html',
  styleUrls: ['./admin-spaces.page.scss'],
  imports: [IonContent, IonIcon, RouterLink]
})
export class AdminSpacesPage{
  readonly navigationItems: NavigationItem[] = [
    {
      label: 'Panoramica',
      icon: 'grid-outline',
      active: false,
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
      active: true,
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
      route: '/admin/statistics'
    }
  ];

  readonly spaces: AdminSpace[] = [
    {
      name: 'Aula Studio A1',
      icon: 'book-outline',
      building: 'Edificio 6',
      capacity: 24,
      status: 'available',
      statusLabel: 'Disponibile'
    },
    {
      name: 'Laboratorio Web',
      icon: 'desktop-outline',
      building: 'Edificio 9',
      capacity: 18,
      status: 'in-use',
      statusLabel: 'In uso'
    },
    {
      name: 'Sala Riunioni B',
      icon: 'desktop-outline',
      building: 'Edificio 6',
      capacity: 12,
      status: 'maintenance',
      statusLabel: 'Manutenzione'
    }
  ];
  
  constructor() {
       addIcons({
        addOutline,
        barChartOutline,
        bookOutline,
        businessOutline,
        calendarOutline,
        checkboxOutline,
        chevronBackOutline,
        chevronDownOutline,
        chevronForwardOutline,
        constructOutline,
        createOutline,
        desktopOutline,
        ellipsisVerticalOutline,
        gridOutline,
        searchOutline
      });
   }

}
