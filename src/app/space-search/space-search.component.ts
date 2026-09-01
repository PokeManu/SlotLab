import { Component,
         Input,
 } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';

@Component({
  selector: 'app-space-search',
  templateUrl: 'space-search.component.html',
  styleUrls: ['space-search.component.scss'],
  imports: [IonIcon],
})
export class SpaceSearchComponent {

@Input()
placeholder = 'Cerca aula, laboratorio o attrezzatura';

@Input()
showFilterButton = true;

  constructor() {
    addIcons({
      searchOutline,
    });
  }
}