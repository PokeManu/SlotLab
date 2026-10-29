import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminBooking, AdminBookingsApi } from './admin-bookings-api';

describe('AdminBookingsApi', () => {
  let api: AdminBookingsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AdminBookingsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carica tutte le pagine e mappa prenotazioni e partecipanti', () => {
    let result: AdminBooking[] = [];
    api.list().subscribe((bookings) => (result = bookings));
    http.expectOne('/api/v1/admin/bookings?page=1&size=100').flush({
      data: [{
        id: 81,
        date: '2026-10-10',
        startTime: '10:00',
        endTime: '12:00',
        spaceName: 'Aula A',
        building: 'Edificio 1',
        floor: 2,
        participantCount: 2,
        status: 'confirmed',
        organizerName: 'Utente Test',
        participants: [{
          firstName: 'Utente',
          lastName: 'Test',
          email: 'utente@example.test',
          present: true,
          checkedInAt: '2026-10-10T09:00:00Z',
        }],
      }],
      pagination: { page: 1, totalPages: 2 },
    });
    http.expectOne('/api/v1/admin/bookings?page=2&size=100').flush({
      data: [{
        id: 82,
        date: '2026-10-11',
        startTime: '13:00',
        endTime: '15:00',
        spaceName: 'Aula B',
        building: 'Edificio 2',
        floor: 1,
        participantCount: 1,
        status: 'completed',
      }],
      pagination: { page: 2, totalPages: 2 },
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      code: '81',
      space: 'Aula A',
      bookedBy: 'Utente Test',
      status: 'Confermata',
      dateLabel: '10/10/2026',
      people: [expect.objectContaining({ email: 'utente@example.test' })],
    });
    expect(result[1]).toMatchObject({
      code: '82',
      status: 'Completata',
      bookedBy: '—',
      people: [],
    });
  });

  it('propaga errori e permette di annullare una pagina successiva', () => {
    let status: number | undefined;
    api.list().subscribe({ error: (error) => (status = error.status) });
    http
      .expectOne('/api/v1/admin/bookings?page=1&size=100')
      .flush({}, { status: 503, statusText: 'Offline' });
    expect(status).toBe(503);

    const subscription = api.list().subscribe();
    http.expectOne('/api/v1/admin/bookings?page=1&size=100').flush({
      data: [],
      pagination: { page: 1, totalPages: 2 },
    });
    const nextPage = http.expectOne('/api/v1/admin/bookings?page=2&size=100');
    subscription.unsubscribe();
    expect(nextPage.cancelled).toBe(true);
  });
});
