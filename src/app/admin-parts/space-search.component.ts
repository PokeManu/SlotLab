import { Component, EventEmitter, Output } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';
@Component({
  selector: 'app-space-search',
  imports: [IonIcon],
  templateUrl: './space-search.component.html',
  styleUrls: ['./space-search.component.scss'],
})
export class SpaceSearchComponent {
  @Output()
  searchChange = new EventEmitter<string>();
  constructor() {
    addIcons({ searchOutline });
  }
}
