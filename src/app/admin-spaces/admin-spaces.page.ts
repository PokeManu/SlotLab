import { SpaceSearchComponent } from '../admin-parts/space-search.component';
import { AdminSidebarComponent } from '../admin-parts/admin-sidebar.component';
import { Auth } from '../auth/auth';
import { Component, inject } from '@angular/core';
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
  imports: [SpaceSearchComponent, AdminSidebarComponent, IonContent, IonIcon]
})
export class AdminSpacesPage{
  readonly auth = inject(Auth);

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
