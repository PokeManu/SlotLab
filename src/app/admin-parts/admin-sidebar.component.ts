import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  barChartOutline,
  businessOutline,
  calendarOutline,
  flagOutline,
  gridOutline,
  homeOutline,
  megaphoneOutline,
  peopleOutline,
  timeOutline,
} from 'ionicons/icons';
import { Auth } from '../auth/auth';
import { adminNavigation } from '../auth/navigation-items';
import { ThemeToggleComponent } from '../theme/theme-toggle.component';
import { ProfilePhoto } from '../profile/profile-photo';
@Component({
  selector: 'app-admin-sidebar',
  imports: [RouterLink, RouterLinkActive, IonIcon, ThemeToggleComponent],
  templateUrl: './admin-sidebar.component.html',
  styleUrls: ['./admin-sidebar.component.scss'],
})
export class AdminSidebarComponent {
  readonly auth = inject(Auth);
  readonly profilePhoto = inject(ProfilePhoto);
  readonly navigationItems = adminNavigation;
  constructor() {
    addIcons({
      barChartOutline,
      businessOutline,
      calendarOutline,
      flagOutline,
      gridOutline,
      homeOutline,
      megaphoneOutline,
      peopleOutline,
      timeOutline,
    });
  }
}
