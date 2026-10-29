import { SpacesApi } from '../api/spaces-api';
import { Auth } from '../auth/auth';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { IonContent, IonList } from '@ionic/angular';
import { SpaceSummary } from '../models/space-summary.model';
import { CampusMapComponent } from '../campus-map/campus-map.component';
import { QuickFiltersComponent } from '../quick-filters/quick-filters.component';
import { SpaceListItemComponent } from '../space-list-item/space-list-item.component';
import { SpaceSearchComponent } from '../space-search/space-search.component';
@Component({
  selector: 'app-spaces',
  templateUrl: './spaces.page.html',
  styleUrls: ['./spaces.page.scss'],
  imports: [
    IonContent,
    IonList,
    SpaceSearchComponent,
    QuickFiltersComponent,
    CampusMapComponent,
    SpaceListItemComponent,
  ],
})
export class SpacesPage implements OnInit, OnDestroy {
  readonly auth = inject(Auth);
  private readonly spacesApi = inject(SpacesApi);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);
  spaces: SpaceSummary[] = [];
  private search = '';
  private availableNow = false;
  private accessible = false;
  private studyRooms = false;
  private minimumSeats = false;
  readonly favoriteSpaceIds = new Set<string>();
  private spacesRequest?: Subscription;
  private favoritesRequest?: Subscription;
  ngOnInit(): void {
    this.loadSpaces();
  }
  ngOnDestroy(): void {
    this.spacesRequest?.unsubscribe();
    this.favoritesRequest?.unsubscribe();
  }
  ionViewDidEnter(): void {
    this.loadFavorites();
  }
  searchSpaces(value: string): void {
    this.search = value.trim();
    this.loadSpaces();
  }
  applyFilters(filters: string[]): void {
    this.availableNow = filters.includes('available-now');
    this.accessible = filters.includes('accessible');
    this.studyRooms = filters.includes('study-rooms');
    this.minimumSeats = filters.includes('minimum-seats');
    this.loadSpaces();
  }
  private loadSpaces(): void {
    this.spacesRequest?.unsubscribe();
    this.spacesRequest = this.spacesApi.list({
      search: this.search,
      availableNow: this.availableNow,
      accessible: this.accessible,
      studyRooms: this.studyRooms,
      minimumSeats: this.minimumSeats,
    }).subscribe({
      next: (spaces) => {
        this.spaces = spaces;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.spaces = [];
        this.changeDetector.markForCheck();
      },
    });
  }
  openSpace(spaceId: string): void {
    this.router.navigate(['/spaces', spaceId], {
      queryParams: { from: 'spaces' },
    });
  }
  toggleFavorite(spaceId: string): void {
    this.favoritesRequest?.unsubscribe();
    if (this.favoriteSpaceIds.has(spaceId)) {
      this.spacesApi.removeFavorite(spaceId).subscribe({
        next: () => {
          this.favoriteSpaceIds.delete(spaceId);
          this.changeDetector.markForCheck();
        },
      });
      return;
    }
    this.spacesApi.addFavorite(spaceId).subscribe({
      next: () => {
        this.favoriteSpaceIds.add(spaceId);
        this.changeDetector.markForCheck();
      },
    });
  }
  private loadFavorites(): void {
    this.favoritesRequest?.unsubscribe();
    this.favoritesRequest = this.spacesApi.favoriteIds().subscribe({
      next: (ids) => {
        this.favoriteSpaceIds.clear();
        for (const id of ids) this.favoriteSpaceIds.add(id);
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.favoriteSpaceIds.clear();
        this.changeDetector.markForCheck();
      },
    });
  }
}
