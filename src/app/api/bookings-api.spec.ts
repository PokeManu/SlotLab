import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BookingListItem } from '../models/booking-list-item.model';
import { BookingsApi } from './bookings-api';

describe('BookingsApi', () => {
  let api: BookingsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(BookingsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('condivide endpoint e mapping delle prenotazioni tra Home e lista', () => {
    let result: BookingListItem[] = [];
    api.list().subscribe((bookings) => (result = bookings));
    http.expectOne('/api/v1/bookings').flush({
      data: [{
        id: 7,
        spaceId: 2,
        spaceName: 'Aula A',
        building: 'Edificio 1',
        floor: 2,
        date: '2026-10-20',
        startTime: '09:00',
        endTime: '10:00',
        status: 'confirmed',
        participantCount: 3,
      }],
    });
    expect(result).toEqual([{
      id: '7',
      spaceId: '2',
      spaceName: 'Aula A',
      building: 'Edificio 1',
      floor: 2,
      dateLabel: '20/10/2026',
      dateValue: '2026-10-20',
      startTime: '09:00',
      endTime: '10:00',
      status: 'confirmed',
      participants: 3,
      spaceType: 'study-room',
    }]);
  });

  it('mantiene URL e metodo di annullamento e propaga gli errori', () => {
    let status = 0;
    api.cancel('7').subscribe({ error: (error) => (status = error.status) });
    http.expectOne({ method: 'DELETE', url: '/api/v1/bookings/7' })
      .flush({}, { status: 409, statusText: 'Conflict' });
    expect(status).toBe(409);
  });

  it('conserva payload e chiave di idempotenza nella creazione', () => {
    const booking = {
      spaceId: 2,
      date: '2026-10-20',
      availabilityId: 4,
      participantEmails: ['ospite@example.com'],
    };
    let id = 0;
    api.create(booking, 'retry-key').subscribe((response) => (id = response.data.id));
    const request = http.expectOne({ method: 'POST', url: '/api/v1/bookings' });
    expect(request.request.body).toEqual(booking);
    expect(request.request.headers.get('Idempotency-Key')).toBe('retry-key');
    request.flush({ data: { id: 9 } });
    expect(id).toBe(9);
  });

  it('condivide dettaglio e operazioni sui partecipanti senza cambiare i contratti', () => {
    let detail: { id: number } | undefined;
    api.detail('9').subscribe((booking) => (detail = booking));
    http.expectOne('/api/v1/bookings/9').flush({ data: {
      id: 9, spaceId: 2, spaceName: 'Aula A', building: 'Edificio 1', floor: 2,
      date: '2026-10-20', startTime: '09:00', endTime: '10:00', participants: [],
    } });
    expect(detail?.id).toBe(9);

    api.addParticipant(9, ' ospite@example.com ').subscribe();
    const add = http.expectOne({ method: 'POST', url: '/api/v1/bookings/9/participants' });
    expect(add.request.body).toEqual({ email: ' ospite@example.com ' });
    add.flush({ data: {} });

    api.removeParticipant(9, 3).subscribe();
    http.expectOne({ method: 'DELETE', url: '/api/v1/bookings/9/participants/3' })
      .flush(null);
  });
});
