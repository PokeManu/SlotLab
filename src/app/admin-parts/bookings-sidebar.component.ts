import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { calendarClearOutline, logOutOutline, homeOutline, searchOutline, calendarOutline, flagOutline, megaphoneOutline, barChartOutline } from 'ionicons/icons';
import { Auth } from '../auth/auth';
import { adminNavigation } from '../auth/navigation-items';

@Component({ selector: 'app-bookings-sidebar', imports: [RouterLink, IonIcon],
  templateUrl: './bookings-sidebar.component.html', styleUrls: ['./bookings-sidebar.component.scss'] })
export class BookingsSidebarComponent {
  readonly auth = inject(Auth);
  readonly sidebarItems = adminNavigation;
  constructor() { addIcons({ calendarClearOutline, logOutOutline, homeOutline, searchOutline, calendarOutline, flagOutline, megaphoneOutline, barChartOutline }); }
  logout() { this.auth.logout().subscribe({ error: () => {} }); }
}
