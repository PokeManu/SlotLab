import { Auth } from '../auth/auth';
import { adminNavigation } from '../auth/navigation-items';
import { Component, inject } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { addIcons } from 'ionicons';

import {
  calendarClearOutline,
  notificationsOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-topbar',
  templateUrl: 'topbar-component.component.html',
  styleUrls: ['topbar-component.component.scss'],
  imports: [
    IonIcon,
    RouterLink,
    RouterLinkActive,
  ],
})
export class TopbarComponent {
  readonly auth = inject(Auth);
  readonly adminNavigation = adminNavigation;
  constructor() {
    addIcons({
      calendarClearOutline,
      notificationsOutline,
    });
  }
}
