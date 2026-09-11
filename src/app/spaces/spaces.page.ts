import { SPACE_PREVIEW_IMAGE } from '../models/space-image';
import { allPages } from '../api/all-pages';
import { Auth } from '../auth/auth';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { SpaceSummary } from '../models/space-summary.model';
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
    TopbarComponent,
    SpaceSearchComponent,
    QuickFiltersComponent,
    CampusMapComponent,
    SpaceListItemComponent,
    MobileNavigationComponent,
  ],
})
export class SpacesPage implements OnInit {
  readonly auth = inject(Auth);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);
  spaces: SpaceSummary[] = [];
  private search = '';
  private availableNow = false;
  private accessible = false;
  private studyRooms = false;
  private minimumSeats = false;
  readonly favoriteSpaceIds = new Set<string>();
  ngOnInit(): void {
    this.loadSpaces();
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
    const params = new URLSearchParams();
    if (this.search) params.set('search', this.search);
    if (this.availableNow) params.set('availableNow', 'true');
    if (this.accessible) params.set('accessible', 'true');
    if (this.studyRooms) params.set('type', 'study_room');
    if (this.minimumSeats) params.set('minSeats', '10');
    const suffix = params.toString() ? `?${params}` : '';
    allPages<{
      id: number;
      name: string;
      type: string;
      building: {
        name: string;
      };
      floor: number;
      capacity: number;
      status: 'active' | 'maintenance' | 'deactivated';
    }>(this.http, `${environment.apiUrl}/spaces${suffix}`).subscribe({
      next: (response) => {
        this.spaces = response.data.map((space) => ({
          id: String(space.id),
          name: space.name,
          type:
            space.type === 'study_room'
              ? 'Aula studio'
              : space.type === 'laboratory'
                ? 'Laboratorio'
                : 'Sala riunioni',
          building: space.building.name,
          floor: space.floor,
          seats: space.capacity,
          image: SPACE_PREVIEW_IMAGE,
          status: space.status,
        }));
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
    if (this.favoriteSpaceIds.has(spaceId)) {
      this.http.delete(`${environment.apiUrl}/favorites/${spaceId}`).subscribe({
        next: () => {
          this.favoriteSpaceIds.delete(spaceId);
          this.changeDetector.markForCheck();
        },
      });
      return;
    }
    this.http.post(`${environment.apiUrl}/favorites/${spaceId}`, {}).subscribe({
      next: () => {
        this.favoriteSpaceIds.add(spaceId);
        this.changeDetector.markForCheck();
      },
    });
  }
  private loadFavorites(): void {
    allPages<{
      id: number;
    }>(this.http, `${environment.apiUrl}/favorites`).subscribe({
      next: (response) => {
        this.favoriteSpaceIds.clear();
        for (const space of response.data)
          this.favoriteSpaceIds.add(String(space.id));
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.favoriteSpaceIds.clear();
        this.changeDetector.markForCheck();
      },
    });
  }
}
