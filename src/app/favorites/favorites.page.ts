import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';

import { FAVORITE_SPACES } from '../data/favorite-spaces.data';

import { FavoriteSpaceCardComponent } from '../favorite-space-card/favorite-space-card.component';
import { MobileNavigationComponent } from '../mobile-navigation/mobile-navigation.component';
import { SpaceSearchComponent } from '../space-search/space-search.component';
import { TopbarComponent } from '../topbar-component/topbar-component.component';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
  imports: [
    IonContent,
    TopbarComponent,
    SpaceSearchComponent,
    FavoriteSpaceCardComponent,
    MobileNavigationComponent,
  ],
})
export class FavoritesPage {
  favoriteSpaces = [...FAVORITE_SPACES];

  constructor(
    private readonly router: Router,
  ) {}

  openSpace(spaceId: string): void {
    this.router.navigate([
      '/spaces',
      spaceId,
    ]);
  }

  removeFavorite(spaceId: string): void {
    this.favoriteSpaces = this.favoriteSpaces.filter(
      (space) => space.id !== spaceId
    );
  }
}