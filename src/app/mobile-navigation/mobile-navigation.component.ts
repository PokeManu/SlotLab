import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  heartOutline,
  homeOutline,
  personOutline,
  searchOutline,
} from 'ionicons/icons';
@Component({
  selector: 'app-mobile-navigation',
  templateUrl: './mobile-navigation.component.html',
  styleUrls: ['./mobile-navigation.component.scss'],
  imports: [IonButton, IonIcon, RouterLink, RouterLinkActive],
})
export class MobileNavigationComponent {
  readonly navigation = [
    { label: 'Home', route: '/home', icon: 'home-outline' },
    { label: 'Cerca', route: '/spaces', icon: 'search-outline' },
    { label: 'Prenotazioni', route: '/bookings', icon: 'calendar-outline' },
    { label: 'Preferiti', route: '/favorites', icon: 'heart-outline' },
    { label: 'Profilo', route: '/profile', icon: 'person-outline' },
  ] as const;
  constructor() {
    addIcons({
      calendarOutline,
      heartOutline,
      homeOutline,
      personOutline,
      searchOutline,
    });
  }
}
