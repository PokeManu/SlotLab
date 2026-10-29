import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { allPages } from './all-pages';

export interface AdminAvailabilitySpace {
  id: number;
  name: string;
}

export interface AdminAvailability {
  availabilityId: number;
  validFrom: string;
  validUntil: string;
  weekday: number;
  startTime: string;
  endTime: string;
  isRetired: boolean;
}

export interface AdminUnavailability {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface AdminAvailabilityPayload {
  validFrom: string;
  validUntil: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface AdminUnavailabilityPayload {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

interface AvailabilityResponse {
  data: AdminAvailability[];
}

interface UnavailabilityResponse {
  data: AdminUnavailability[];
}

@Injectable({ providedIn: 'root' })
export class AdminAvailabilityApi {
  private readonly http = inject(HttpClient);
  private readonly spacesUrl = `${environment.apiUrl}/admin/spaces`;

  listSpaces() {
    return allPages<AdminAvailabilitySpace>(this.http, this.spacesUrl);
  }

  listAvailability(spaceId: number): Observable<AdminAvailability[]> {
    return this.http
      .get<AvailabilityResponse>(`${this.spaceUrl(spaceId)}/availability`)
      .pipe(map(({ data }) => data));
  }

  listUnavailability(spaceId: number): Observable<AdminUnavailability[]> {
    return this.http
      .get<UnavailabilityResponse>(`${this.spaceUrl(spaceId)}/unavailability`)
      .pipe(map(({ data }) => data));
  }

  createAvailability(spaceId: number, payload: AdminAvailabilityPayload) {
    return this.http.post(this.spaceUrl(spaceId) + '/availability', payload);
  }

  updateAvailability(
    spaceId: number,
    availabilityId: number,
    payload: AdminAvailabilityPayload,
  ) {
    return this.http.patch(
      `${this.spaceUrl(spaceId)}/availability/${availabilityId}`,
      payload,
    );
  }

  reuseAvailability(
    spaceId: number,
    availabilityId: number,
    payload: AdminAvailabilityPayload,
  ) {
    return this.http.post(
      `${this.spaceUrl(spaceId)}/availability/${availabilityId}/reuse`,
      payload,
    );
  }

  retireAvailability(spaceId: number, availabilityId: number) {
    return this.http.delete(
      `${this.spaceUrl(spaceId)}/availability/${availabilityId}`,
    );
  }

  createUnavailability(spaceId: number, payload: AdminUnavailabilityPayload) {
    return this.http.post(`${this.spaceUrl(spaceId)}/unavailability`, payload);
  }

  removeUnavailability(spaceId: number, unavailabilityId: number) {
    return this.http.delete(
      `${this.spaceUrl(spaceId)}/unavailability/${unavailabilityId}`,
    );
  }

  private spaceUrl(spaceId: number): string {
    return `${this.spacesUrl}/${spaceId}`;
  }
}
