import { Component, inject } from '@angular/core';
import { Auth } from '../auth/auth';
import { adminNavigation } from '../auth/navigation-items';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  heartOutline,
  homeOutline,
  personOutline,
  searchOutline,
  flagOutline, megaphoneOutline,
  barChartOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-mobile-navigation',
  templateUrl: './mobile-navigation.component.html',
  styleUrls: ['./mobile-navigation.component.scss'],
  imports: [
    IonIcon,
    RouterLink,
    RouterLinkActive,
  ],
})
export class MobileNavigationComponent {
  readonly auth = inject(Auth);
  readonly adminNavigation = adminNavigation;
  constructor() {
    addIcons({
      calendarOutline,
      heartOutline,
      homeOutline,
      personOutline,
      searchOutline,
      flagOutline, megaphoneOutline,
      barChartOutline,
    });
  }
}
