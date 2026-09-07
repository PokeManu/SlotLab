import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon} from '@ionic/angular';
import { addIcons } from 'ionicons';
 import {
    accessibilityOutline,
    chevronForwardOutline,
    flagOutline,
    notificationsOutline,
    personOutline,
    shieldCheckmarkOutline,
  } from 'ionicons/icons';
import { MobileNavigationComponent } from '../mobile-navigation/mobile-navigation.component';
import { TopbarComponent } from '../topbar-component/topbar-component.component';
import { Auth } from '../auth/auth';
interface ProfileMenuItem{
  label: string;
  icon:string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [
    IonContent,
    TopbarComponent,
    MobileNavigationComponent,
    RouterLink,
  ],
})
export class ProfilePage {

  readonly auth = inject(Auth);
  get user() {
    const account = this.auth.user();
    return {
      initials: this.auth.initials,
      fullName: account ? `${account.firstName} ${account.lastName}` : '',
      role: this.auth.isAdmin() ? 'Amministratore' : 'Utente',
      email: account?.email ?? '',
    };
  }

  readonly menuItems: ProfileMenuItem[] = [
    {
      label: 'Dati personali',
      icon: 'person-outline',
    },
    {
      label: 'Preferenze notifiche',
      icon: 'notifications-outline',
    },
    {
      label: 'Le mie segnalazioni',
      icon: 'flag-outline',
    },
  ];

  constructor(private readonly router: Router){
      addIcons({
        accessibilityOutline,
        chevronForwardOutline,
        flagOutline,
        notificationsOutline,
        personOutline,
        shieldCheckmarkOutline,
      });
  }

  logout(): void{
    this.auth.logout().subscribe({ error: () => {} });
  }
}
