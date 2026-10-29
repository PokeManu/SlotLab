import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { allPages } from './all-pages';

export interface AdminSummary {
  bookingCount: number;
  spaceCount: number;
  availableSpaceCount: number;
  openReportCount: number;
}

export interface DashboardBooking {
  time: string;
  name: string;
  building: string;
  details: string;
  status: string;
}

export interface DashboardSpaceStatus {
  icon: string;
  name: string;
  details: string;
  tone: 'available' | 'warning';
}

interface AdminBookingDto {
  date: string;
  startTime: string;
  spaceName: string;
  building: string;
  participantCount: number;
  status: string;
}

interface AdminSpaceDto {
  status: string;
  type: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class AdminDashboardApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin`;

  summary() {
    return this.http
      .get<{ data: AdminSummary }>(`${this.baseUrl}/summary`)
      .pipe(map(({ data }) => data));
  }

  upcomingBookings(now = new Date()) {
    const current = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(now);
    return allPages<AdminBookingDto>(
      this.http,
      `${this.baseUrl}/bookings?size=5`,
    ).pipe(
      map(({ data }): DashboardBooking[] =>
        data
          .filter(
            (item) =>
              item.status === 'confirmed' &&
              `${item.date} ${item.startTime}` > current,
          )
          .sort((a, b) =>
            `${a.date} ${a.startTime}`.localeCompare(
              `${b.date} ${b.startTime}`,
            ),
          )
          .slice(0, 5)
          .map((item) => ({
            time: `${item.date} ${item.startTime}`,
            name: item.spaceName,
            building: item.building,
            details: `${item.participantCount} partecipanti`,
            status: 'Confermata',
          })),
      ),
    );
  }

  spaceStatuses() {
    return this.http
      .get<{ data: AdminSpaceDto[] }>(`${this.baseUrl}/spaces`)
      .pipe(
        map(({ data }): DashboardSpaceStatus[] =>
          data.slice(0, 4).map((item) => ({
            icon:
              item.type === 'study_room' ? 'book-outline' : 'desktop-outline',
            name: item.name,
            details:
              item.status === 'active'
                ? 'Disponibile'
                : item.status === 'maintenance'
                  ? 'Manutenzione'
                  : 'Disattivato',
            tone: item.status === 'active' ? 'available' : 'warning',
          })),
        ),
      );
  }

  refreshReports() {
    return this.http.get<{ data: Array<{ status: string }> }>(
      `${this.baseUrl}/reports`,
    );
  }
}
