import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { SPACE_PREVIEW_IMAGE } from '../models/space-image';
import { Space } from '../data/spaces.data';
import { FavoriteSpace } from '../models/favorite-space.model';
import { SpaceSummary } from '../models/space-summary.model';
import { allPages } from './all-pages';

interface SpaceDto {
  id: number;
  name: string;
  type: string;
  building: { name: string };
  floor: number;
  capacity: number;
  status?: 'active' | 'maintenance' | 'deactivated';
  accessible?: boolean;
  services?: string[];
}

export interface AvailabilitySlot {
  availabilityId: number;
  bookable: boolean;
  availableSeats: number;
  startTime: string;
  endTime: string;
}

export interface SpaceDetail {
  space: Space;
  status: 'active' | 'maintenance' | 'deactivated';
}

export interface SpaceFilters {
  search: string;
  availableNow: boolean;
  accessible: boolean;
  studyRooms: boolean;
  minimumSeats: boolean;
}

@Injectable({ providedIn: 'root' })
export class SpacesApi {
  private readonly http = inject(HttpClient);

  recommended() {
    return this.http
      .get<{ data: SpaceDto[] }>(`${environment.apiUrl}/spaces/recommended`)
      .pipe(map((response) => response.data.map((space) => this.summary(space))));
  }

  list(filters: SpaceFilters) {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.availableNow) params.set('availableNow', 'true');
    if (filters.accessible) params.set('accessible', 'true');
    if (filters.studyRooms) params.set('type', 'study_room');
    if (filters.minimumSeats) params.set('minSeats', '10');
    const suffix = params.toString() ? `?${params}` : '';
    return allPages<SpaceDto>(
      this.http,
      `${environment.apiUrl}/spaces${suffix}`,
    ).pipe(map((response) => response.data.map((space) => this.summary(space))));
  }

  detail(id: string) {
    return this.http
      .get<{ data: SpaceDto }>(`${environment.apiUrl}/spaces/${id}`)
      .pipe(
        map(({ data }): SpaceDetail => ({
          space: {
            ...this.summary(data),
            image: SPACE_PREVIEW_IMAGE,
            accessible: Boolean(data.accessible),
            services: data.services ?? [],
          },
          status:
            data.status === 'maintenance' || data.status === 'deactivated'
              ? data.status
              : 'active',
        })),
      );
  }

  availability(id: string, date: string) {
    return this.http
      .get<{ data: AvailabilitySlot[] }>(
        `${environment.apiUrl}/spaces/${id}/availability?date=${date}`,
      )
      .pipe(map(({ data }) => data));
  }

  favorites() {
    return allPages<SpaceDto>(this.http, `${environment.apiUrl}/favorites`).pipe(
      map(({ data }): FavoriteSpace[] =>
        data.map((space) => ({
          ...this.summary(space),
          availability:
            space.status === 'active'
              ? 'Disponibilità da verificare'
              : 'Non disponibile',
          availabilityTone:
            space.status === 'active' ? 'available' : 'warning',
        })),
      ),
    );
  }

  favoriteIds() {
    return allPages<Pick<SpaceDto, 'id'>>(
      this.http,
      `${environment.apiUrl}/favorites`,
    ).pipe(map(({ data }) => data.map((space) => String(space.id))));
  }

  addFavorite(id: string) {
    return this.http.post<void>(`${environment.apiUrl}/favorites/${id}`, {});
  }

  removeFavorite(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/favorites/${id}`);
  }

  private summary(space: SpaceDto): SpaceSummary {
    return {
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
      ...(space.status ? { status: space.status } : {}),
    };
  }
}
