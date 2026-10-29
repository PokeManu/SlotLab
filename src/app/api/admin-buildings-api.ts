import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdminBuilding {
  id: number;
  number: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface AdminBuildingPayload {
  number: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

@Injectable({ providedIn: 'root' })
export class AdminBuildingsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/admin/buildings`;

  list() {
    return this.http
      .get<{ data: AdminBuilding[] }>(this.url)
      .pipe(map(({ data }) => data));
  }

  create(payload: AdminBuildingPayload) {
    return this.http.post(this.url, payload);
  }

  update(id: number, payload: AdminBuildingPayload) {
    return this.http.patch(`${this.url}/${id}`, payload);
  }

  remove(id: number) {
    return this.http.delete(`${this.url}/${id}`);
  }
}
