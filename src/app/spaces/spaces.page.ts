import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { notificationsOutline } from 'ionicons/icons';

import { SPACES } from '../data/spaces.data';

import { CampusMapComponent } from '../campus-map/campus-map.component';
import { QuickFiltersComponent } from '../quick-filters/quick-filters.component';
import { SpaceListItemComponent } from '../space-list-item/space-list-item.component';
import { SpaceSearchComponent } from '../space-search/space-search.component';
import { TopbarComponent } from '../topbar-component/topbar-component.component';
import { MobileNavigationComponent } from '../mobile-navigation/mobile-navigation.component';

@Component({
  selector: 'app-spaces',
  templateUrl: './spaces.page.html',
  styleUrls: ['./spaces.page.scss'],
  imports: [
    IonContent,
    IonIcon,
    TopbarComponent,
    SpaceSearchComponent,
    QuickFiltersComponent,
    CampusMapComponent,
    SpaceListItemComponent,
    MobileNavigationComponent,
  ],
})
export class SpacesPage {
  readonly spaces = SPACES;

  readonly favoriteSpaceIds = new Set<string>();

  constructor(
    private readonly router: Router,
  ) {
    addIcons({ notificationsOutline });
  }

  openSpace(spaceId: string): void {
    this.router.navigate([
      '/spaces',
      spaceId,
    ]);
  }

  toggleFavorite(spaceId: string): void {
    if (this.favoriteSpaceIds.has(spaceId)) {
      this.favoriteSpaceIds.delete(spaceId);
      return;
    }

    this.favoriteSpaceIds.add(spaceId);
  }
}
