import { Component, Input, Output, EventEmitter } from '@angular/core';
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
  @Output()
  searchChange = new EventEmitter<string>();
  @Input()
  placeholder = 'Cerca aula, laboratorio o attrezzatura';
  constructor() {
    addIcons({
      searchOutline,
    });
  }
}
