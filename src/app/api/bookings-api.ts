import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { BookingListItem } from '../models/booking-list-item.model';

interface BookingDto {
  id: number;
  spaceId: number;
  spaceName: string;
  building: string;
  floor: number;
  date: string;
  startTime: string;
  endTime: string;
  status: 'confirmed';
  participantCount: number;
}

export interface NewBooking {
  spaceId: number;
  date: string;
  availabilityId: number;
  participantEmails: string[];
}

export interface BookingParticipant {
  id: number;
  participantId: number;
  firstName: string;
  lastName: string;
  email: string;
  participantRole: string;
  present: boolean;
}

export interface BookingDetail {
  id: number;
  spaceId: number;
  spaceName: string;
  building: string;
  floor: number;
  date: string;
  startTime: string;
  endTime: string;
  participants: BookingParticipant[];
}

@Injectable({ providedIn: 'root' })
export class BookingsApi {
  private readonly http = inject(HttpClient);

  list() {
    return this.http
      .get<{ data: BookingDto[] }>(`${environment.apiUrl}/bookings`)
      .pipe(map((response) => response.data.map((booking) => this.summary(booking))));
  }

  cancel(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/bookings/${id}`);
  }

  create(booking: NewBooking, idempotencyKey: string) {
    return this.http.post<{ data: { id: number } }>(
      `${environment.apiUrl}/bookings`,
      booking,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  }

  detail(id: string) {
    return this.http
      .get<{ data: BookingDetail }>(`${environment.apiUrl}/bookings/${id}`)
      .pipe(map((response) => response.data));
  }

  addParticipant(bookingId: number, email: string) {
    return this.http.post(
      `${environment.apiUrl}/bookings/${bookingId}/participants`,
      { email },
    );
  }

  removeParticipant(bookingId: number, participantId: number) {
    return this.http.delete(
      `${environment.apiUrl}/bookings/${bookingId}/participants/${participantId}`,
    );
  }

  private summary(booking: BookingDto): BookingListItem {
    return {
      id: String(booking.id),
      spaceId: String(booking.spaceId),
      spaceName: booking.spaceName,
      status: booking.status,
      dateLabel: new Date(`${booking.date}T12:00:00Z`).toLocaleDateString(
        'it-IT',
        { timeZone: 'Europe/Rome' },
      ),
      dateValue: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      building: booking.building,
      floor: booking.floor,
      participants: booking.participantCount,
      spaceType: 'study-room',
    };
  }
}
