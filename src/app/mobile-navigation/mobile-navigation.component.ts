import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ionic/angular';
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
  imports: [
    IonIcon,
    RouterLink,
    RouterLinkActive,
  ],
})
export class MobileNavigationComponent {
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
