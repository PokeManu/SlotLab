import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface StatisticsData {
  dateFrom: string;
  dateTo: string;
  bookings: number;
  participants: number;
  presences: number;
  absences: number;
  offeredCapacity: number;
  utilizationRate: number | null;
  checkInRate: number | null;
  daily: Array<{ date: string; bookings: number }>;
  usage: Array<{ type: string; presences: number; percentage: number | null }>;
  mostBookedSpaces: Array<{
    spaceId: number;
    spaceName: string;
    bookings: number;
    participants: number;
    presences: number;
  }>;
  mostUsedSlots: Array<{
    startTime: string;
    endTime: string;
    bookings: number;
    participants: number;
    presences: number;
  }>;
  reportsByCategory: Array<{ category: string; count: number }>;
  reportsByStatus: Array<{ status: string; count: number }>;
  history: {
    trackingStartedAt: string | null;
    complete: boolean;
    excludedBookings: number;
    ambiguousOccurrences?: number;
    gapOccurrences?: number;
  };
}

@Injectable({ providedIn: 'root' })
export class AdminStatisticsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/admin/statistics`;

  load(dateFrom: string, dateTo: string) {
    const query = `?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`;
    return this.http
      .get<{ data: StatisticsData }>(`${this.url}${query}`)
      .pipe(map(({ data }) => this.normalise(data)));
  }

  private normalise(data: StatisticsData): StatisticsData {
    return {
      ...data,
      daily: data.daily ?? [],
      usage: data.usage ?? [],
      mostBookedSpaces: data.mostBookedSpaces ?? [],
      mostUsedSlots: data.mostUsedSlots ?? [],
      reportsByCategory: data.reportsByCategory ?? [],
      reportsByStatus: data.reportsByStatus ?? [],
      history: data.history ?? {
        trackingStartedAt: null,
        complete: false,
        excludedBookings: 0,
      },
    };
  }
}
