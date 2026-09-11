import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  barChartOutline,
  businessOutline,
  calendarOutline,
  flagOutline,
  gridOutline,
  homeOutline,
  logOutOutline,
  megaphoneOutline,
  peopleOutline,
  timeOutline,
} from 'ionicons/icons';
import { Auth } from '../auth/auth';
import { adminNavigation } from '../auth/navigation-items';
@Component({
  selector: 'app-bookings-sidebar',
  imports: [RouterLink, IonIcon],
  templateUrl: './bookings-sidebar.component.html',
  styleUrls: ['./bookings-sidebar.component.scss'],
})
export class BookingsSidebarComponent {
  readonly auth = inject(Auth);
  readonly sidebarItems = adminNavigation;
  constructor() {
    addIcons({
      barChartOutline,
      businessOutline,
      calendarOutline,
      flagOutline,
      gridOutline,
      homeOutline,
      logOutOutline,
      megaphoneOutline,
      peopleOutline,
      timeOutline,
    });
  }
  logout() {
    this.auth.logout().subscribe({ error: () => {} });
  }
}
