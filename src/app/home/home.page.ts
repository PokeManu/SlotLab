import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { TopbarComponent } from '../topbar-component/topbar-component.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonContent, TopbarComponent],
})
export class HomePage {

}
