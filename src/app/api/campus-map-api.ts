import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { allPages } from './all-pages';

export interface CampusMapBuilding {
  id: number;
  number: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface CampusMapSpace {
  id: number;
  name: string;
  floor: number;
  type: string;
  capacity: number;
  building: {
    id: number;
  };
}

@Injectable({ providedIn: 'root' })
export class CampusMapApi {
  private readonly http = inject(HttpClient);
  private readonly buildingsUrl = `${environment.apiUrl}/buildings`;
  private readonly spacesUrl = `${environment.apiUrl}/spaces?size=100`;

  listBuildings() {
    return this.http.get<{ data: CampusMapBuilding[] }>(this.buildingsUrl);
  }

  listSpaces() {
    return allPages<CampusMapSpace>(this.http, this.spacesUrl);
  }
}
