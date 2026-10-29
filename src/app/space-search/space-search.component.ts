import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonSearchbar } from '@ionic/angular';
@Component({
  selector: 'app-space-search',
  templateUrl: 'space-search.component.html',
  styleUrls: ['space-search.component.scss'],
  imports: [IonSearchbar],
})
export class SpaceSearchComponent {
  @Output()
  searchChange = new EventEmitter<string>();
  @Input()
  placeholder = 'Cerca aula, laboratorio o attrezzatura';
}
