import { SpacesApi } from '../api/spaces-api';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { FavoriteSpace } from '../models/favorite-space.model';
import { FavoriteSpaceCardComponent } from '../favorite-space-card/favorite-space-card.component';
import { SpaceSearchComponent } from '../space-search/space-search.component';
@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
  imports: [
    IonButton,
    IonContent,
    IonSpinner,
    SpaceSearchComponent,
    FavoriteSpaceCardComponent,
  ],
})
export class FavoritesPage implements OnInit, OnDestroy {
  private readonly spacesApi = inject(SpacesApi);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  favoriteSpaces: FavoriteSpace[] = [];
  loading = false;
  error = '';
  private searchTerm = '';
  private hasEntered = false;
  private loadRequest?: Subscription;
  get visibleFavoriteSpaces(): FavoriteSpace[] {
    if (!this.searchTerm) return this.favoriteSpaces;
    return this.favoriteSpaces.filter((space) =>
      [space.name, space.building, space.type].some((value) =>
        value.toLocaleLowerCase('it-IT').includes(this.searchTerm),
      ),
    );
  }
  filterFavorites(value: string): void {
    this.searchTerm = value.trim().toLocaleLowerCase('it-IT');
  }
  ngOnInit(): void {
    this.loadFavorites();
  }
  ionViewDidEnter(): void {
    if (this.hasEntered) this.loadFavorites();
    this.hasEntered = true;
  }
  ngOnDestroy(): void {
    this.loadRequest?.unsubscribe();
  }
  loadFavorites(): void {
    this.loadRequest?.unsubscribe();
    this.loading = true;
    this.error = '';
    this.loadRequest = this.spacesApi.favorites().subscribe({
      next: (spaces) => {
        this.favoriteSpaces = spaces;
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.favoriteSpaces = [];
        this.loading = false;
        this.error = 'Impossibile caricare i preferiti.';
        this.changeDetector.markForCheck();
      },
    });
  }
  openSpace(spaceId: string): void {
    this.router.navigate(['/spaces', spaceId], {
      queryParams: { from: 'favorites' },
    });
  }
  removeFavorite(spaceId: string): void {
    this.loadRequest?.unsubscribe();
    this.loading = false;
    this.error = '';
    this.spacesApi.removeFavorite(spaceId).subscribe({
      next: () => {
        this.favoriteSpaces = this.favoriteSpaces.filter(
          (space) => space.id !== spaceId,
        );
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.error = 'Impossibile rimuovere lo spazio dai preferiti. Riprova.';
        this.changeDetector.markForCheck();
      },
    });
  }
}
