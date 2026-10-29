import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, expand, map, reduce } from 'rxjs';
import { environment } from '../../environments/environment';

export type AdminBookingStatus = 'Confermata' | 'Completata';

interface BookingParticipant {
  firstName: string;
  lastName: string;
  email: string;
  present: boolean;
  checkedInAt: string | null;
}

interface ApiBooking {
  participants?: BookingParticipant[];
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  spaceName: string;
  building: string;
  floor: number;
  participantCount: number;
  status: string;
  organizerName: string;
}

interface BookingResponse {
  data: ApiBooking[];
  pagination: { page: number; totalPages: number };
}

export interface AdminBooking {
  people?: BookingParticipant[];
  code: string;
  startTime: string;
  endTime: string;
  space: string;
  bookedBy: string;
  participants: number;
  status: AdminBookingStatus;
  dateLabel: string;
  dateValue: string;
  building: string;
  floor: number;
}

@Injectable({ providedIn: 'root' })
export class AdminBookingsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/admin/bookings`;

  list() {
    const fetchPage = (page: number) =>
      this.http.get<BookingResponse>(`${this.url}?page=${page}&size=100`);

    return fetchPage(1).pipe(
      expand((response) =>
        response.pagination.page < response.pagination.totalPages
          ? fetchPage(response.pagination.page + 1)
          : EMPTY,
      ),
      reduce((rows: ApiBooking[], response) => rows.concat(response.data), []),
      map((rows): AdminBooking[] =>
        rows.map((booking) => ({
          people: booking.participants ?? [],
          code: String(booking.id),
          startTime: booking.startTime,
          endTime: booking.endTime,
          space: booking.spaceName,
          bookedBy: booking.organizerName ?? '—',
          participants: booking.participantCount,
          status: booking.status === 'completed' ? 'Completata' : 'Confermata',
          dateLabel: new Date(`${booking.date}T12:00:00Z`).toLocaleDateString(
            'it-IT',
            { timeZone: 'Europe/Rome' },
          ),
          dateValue: booking.date,
          building: booking.building,
          floor: booking.floor,
        })),
      ),
    );
  }
}
