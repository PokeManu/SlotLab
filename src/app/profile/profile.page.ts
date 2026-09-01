import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
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
    IonIcon,
    TopbarComponent,
    MobileNavigationComponent,
  ],
})
export class ProfilePage {

  readonly user= {
    initials: 'FG',
    fullName: 'Francesco Genova',
    role: 'Studente',
    email: 'francesco.genova@community.unipa.it',
  };

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
    void this.router.navigate(['/home']);
  }
}
