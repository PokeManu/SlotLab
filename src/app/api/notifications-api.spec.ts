import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NotificationsApi } from './notifications-api';

describe('NotificationsApi', () => {
  let api: NotificationsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(NotificationsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('carica tutte le pagine senza cambiare URL o campi', () => {
    let ids: number[] = [];
    api.list().subscribe((items) => (ids = items.map((item) => item.id)));
    http.expectOne('/api/v1/notifications').flush({
      data: [{ id: 1, type: 'booking_created', title: 'Prenotazione', message: 'Ok', createdAt: '2026-10-10T10:00:00Z', read: false }],
      pagination: { page: 1, totalPages: 2 },
    });
    http.expectOne('/api/v1/notifications?page=2').flush({
      data: [{ id: 2, type: 'report_updated', title: 'Segnalazione', message: 'Ok', createdAt: '2026-10-10T11:00:00Z', read: true }],
      pagination: { page: 2, totalPages: 2 },
    });
    expect(ids).toEqual([1, 2]);
  });

  it('mantiene PATCH per lettura singola e globale', () => {
    api.markRead(2).subscribe();
    const one = http.expectOne({ method: 'PATCH', url: '/api/v1/notifications/2/read' });
    expect(one.request.body).toEqual({});
    one.flush({ data: { read: true } });

    api.markAllRead().subscribe();
    const all = http.expectOne({ method: 'PATCH', url: '/api/v1/notifications/read-all' });
    expect(all.request.body).toEqual({});
    all.flush(null);
  });
});
