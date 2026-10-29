import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminDashboardApi } from './admin-dashboard-api';

describe('AdminDashboardApi', () => {
  let api: AdminDashboardApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AdminDashboardApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('legge il riepilogo dal contratto data e propaga gli errori', () => {
    const summary = {
      bookingCount: 2,
      spaceCount: 4,
      availableSpaceCount: 3,
      openReportCount: 1,
    };
    let result: typeof summary | undefined;
    api.summary().subscribe((value) => (result = value));
    http.expectOne('/api/v1/admin/summary').flush({ data: summary });
    expect(result).toEqual(summary);

    let status: number | undefined;
    api.summary().subscribe({ error: (error) => (status = error.status) });
    http
      .expectOne('/api/v1/admin/summary')
      .flush({}, { status: 503, statusText: 'Offline' });
    expect(status).toBe(503);
  });

  it('considera tutte le pagine e mostra solo le prime cinque prenotazioni future confermate', () => {
    let names: string[] | undefined;
    api.upcomingBookings(new Date('2026-10-10T08:00:00Z')).subscribe((items) => {
      names = items.map((item) => item.name);
    });
    const booking = (name: string, date = '2026-10-11', status = 'confirmed') => ({
      date,
      startTime: '10:00',
      spaceName: name,
      building: 'Edificio 1',
      participantCount: 2,
      status,
    });
    http.expectOne('/api/v1/admin/bookings?size=5').flush({
      data: [booking('D'), booking('Scaduta', '2026-10-09'), booking('E')],
      pagination: { page: 1, totalPages: 2 },
    });
    http.expectOne('/api/v1/admin/bookings?size=5&page=2').flush({
      data: [
        booking('A'),
        booking('B'),
        booking('C'),
        booking('F'),
        booking('Annullata', '2026-10-11', 'cancelled'),
      ],
      pagination: { page: 2, totalPages: 2 },
    });
    expect(names).toEqual(['D', 'E', 'A', 'B', 'C']);
  });

  it('mappa i primi quattro stati degli spazi senza cambiare il GET dei report', () => {
    let statuses: Array<{ name: string; details: string; tone: string }> = [];
    api.spaceStatuses().subscribe((value) => (statuses = value));
    http.expectOne('/api/v1/admin/spaces').flush({
      data: [
        { name: 'A', type: 'study_room', status: 'active' },
        { name: 'B', type: 'lab', status: 'maintenance' },
        { name: 'C', type: 'lab', status: 'inactive' },
        { name: 'D', type: 'lab', status: 'active' },
        { name: 'E', type: 'lab', status: 'active' },
      ],
    });
    expect(statuses.map((item) => item.name)).toEqual(['A', 'B', 'C', 'D']);
    expect(statuses[0]).toMatchObject({ details: 'Disponibile', tone: 'available' });
    expect(statuses[1]).toMatchObject({ details: 'Manutenzione', tone: 'warning' });
    expect(statuses[2]).toMatchObject({ details: 'Disattivato', tone: 'warning' });

    api.refreshReports().subscribe();
    http.expectOne('/api/v1/admin/reports').flush({ data: [] });
  });
});
