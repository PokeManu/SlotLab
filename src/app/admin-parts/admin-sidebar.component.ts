import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkboxOutline, homeOutline, searchOutline, calendarOutline, flagOutline, megaphoneOutline, barChartOutline } from 'ionicons/icons';
import { Auth } from '../auth/auth';
import { adminNavigation } from '../auth/navigation-items';

@Component({ selector: 'app-admin-sidebar', imports: [RouterLink, RouterLinkActive, IonIcon],
  templateUrl: './admin-sidebar.component.html', styleUrls: ['./admin-sidebar.component.scss'] })
export class AdminSidebarComponent {
  readonly auth = inject(Auth);
  readonly navigationItems = adminNavigation;
  constructor() { addIcons({ checkboxOutline, homeOutline, searchOutline, calendarOutline, flagOutline, megaphoneOutline, barChartOutline }); }
  logout() { this.auth.logout().subscribe({ error: () => {} }); }
}
