import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { FavoriteSpace } from '../models/favorite-space.model';

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
export class FavoritesPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  favoriteSpaces: FavoriteSpace[] = [];

  constructor(
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadFavorites();
  }

  ionViewDidEnter(): void {
    this.loadFavorites();
  }

  private loadFavorites(): void {
    this.http.get<{ data: Array<{ id: number; name: string; building: { name: string }; floor: number; type: string; capacity: number; status: string }> }>(
      `${environment.apiUrl}/favorites`,
    ).subscribe({ next: response => {
      this.favoriteSpaces = response.data.map(space => ({
        id: String(space.id), name: space.name, building: space.building.name, floor: space.floor,
        type: space.type === 'study_room' ? 'Aula studio' : space.type === 'laboratory' ? 'Laboratorio' : 'Sala riunioni',
        seats: space.capacity, availability: space.status === 'active' ? 'Disponibilità da verificare' : 'Non disponibile',
        availabilityTone: space.status === 'active' ? 'available' : 'warning',
      } as FavoriteSpace));
      this.changeDetector.markForCheck();
    }, error: () => { this.favoriteSpaces = []; this.changeDetector.markForCheck(); } });
  }

  openSpace(spaceId: string): void {
    this.router.navigate([
      '/spaces',
      spaceId,
    ]);
  }

  removeFavorite(spaceId: string): void {
    this.http.delete(`${environment.apiUrl}/favorites/${spaceId}`).subscribe({
      next: () => { this.favoriteSpaces = this.favoriteSpaces.filter(space => space.id !== spaceId); this.changeDetector.markForCheck(); },
    });
  }
}
