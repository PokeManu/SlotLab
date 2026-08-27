import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { TopbarComponent } from '../topbar-component/topbar-component.component';
import { SpaceSearchComponent } from '../space-search/space-search.component';
import { QuickFiltersComponent } from '../quick-filters/quick-filters.component';
import { CampusMapComponent } from '../campus-map/campus-map.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonContent,
    TopbarComponent,
    SpaceSearchComponent,
    QuickFiltersComponent,
    CampusMapComponent,
  ],
})
export class HomePage {

}
