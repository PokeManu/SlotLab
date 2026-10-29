import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { allPages } from './all-pages';

export interface AdminSpaceBuilding {
  id: number;
  name: string;
}

export interface AdminSpaceListItem {
  id: number;
  name: string;
  building: {
    name: string;
  };
  capacity: number;
  type: string;
  status: string;
}

export interface AdminSpaceDetail {
  id: number;
  building: {
    id: number;
  };
  name: string;
  floor: number;
  type: string;
  capacity: number;
  accessible: boolean;
  status: string;
  serviceCodes: string[];
}

export interface AdminSpacePayload {
  buildingId: number;
  name: string;
  floor: number;
  type: string;
  capacity: number;
  accessible: boolean;
  status: string;
  serviceCodes: string[];
}

@Injectable({ providedIn: 'root' })
export class AdminSpacesApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/admin/spaces`;
  private readonly buildingsUrl = `${environment.apiUrl}/admin/buildings`;

  list(search = '') {
    const query = search.trim()
      ? `?search=${encodeURIComponent(search.trim())}`
      : '';
    return allPages<AdminSpaceListItem>(this.http, `${this.url}${query}`);
  }

  buildings() {
    return allPages<AdminSpaceBuilding>(this.http, this.buildingsUrl);
  }

  detail(id: number) {
    return this.http.get<{ data: AdminSpaceDetail }>(`${this.url}/${id}`);
  }

  create(payload: AdminSpacePayload) {
    return this.http.post(this.url, payload);
  }

  update(id: number, payload: AdminSpacePayload) {
    return this.http.patch(`${this.url}/${id}`, payload);
  }

  remove(id: number) {
    return this.http.delete(`${this.url}/${id}`);
  }
}
