import { Auth } from '../auth/auth';
import { adminNavigation } from '../auth/navigation-items';
import { Component, inject } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { addIcons } from 'ionicons';
import { notificationsOutline, megaphoneOutline } from 'ionicons/icons';
import { ThemeToggleComponent } from '../theme/theme-toggle.component';
import { ProfilePhoto } from '../profile/profile-photo';
import { NotificationState } from '../notifications/notification-state';
@Component({
  selector: 'app-topbar',
  templateUrl: 'topbar-component.component.html',
  styleUrls: ['topbar-component.component.scss'],
  imports: [IonIcon, RouterLink, RouterLinkActive, ThemeToggleComponent],
})
export class TopbarComponent {
  readonly auth = inject(Auth);
  readonly profilePhoto = inject(ProfilePhoto);
  readonly notificationState = inject(NotificationState);
  readonly adminNavigation = adminNavigation;
  constructor() {
    addIcons({
      notificationsOutline,
      megaphoneOutline,
    });
  }
}
