import { Component, EventEmitter, Output } from '@angular/core';
import { IonSearchbar } from '@ionic/angular';
@Component({
  selector: 'app-space-search',
  imports: [IonSearchbar],
  templateUrl: './space-search.component.html',
  styleUrls: ['./space-search.component.scss'],
})
export class SpaceSearchComponent {
  @Output()
  searchChange = new EventEmitter<string>();
}
