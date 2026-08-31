import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular';

import { MobileNavigationComponent } from '../mobile-navigation/mobile-navigation.component';
import { TopbarComponent } from '../topbar-component/topbar-component.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [
    IonContent,
    TopbarComponent,
    MobileNavigationComponent,
  ],
})
export class ProfilePage {}
