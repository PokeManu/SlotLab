import { Component } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';

import{
  calendarClearOutline,
  notificationsOutline,
}from 'ionicons/icons';

@Component({
  selector: 'app-topbar',
  templateUrl: 'topbar-component.component.html',
  styleUrls: ['topbar-component.component.scss'],
  imports: [IonIcon],
})
export class TopbarComponent {

  constructor() {
    addIcons({
      calendarClearOutline,
      notificationsOutline,
    })
  }

}