import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminStatisticsApi, StatisticsData } from './admin-statistics-api';

describe('AdminStatisticsApi', () => {
  let api: AdminStatisticsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AdminStatisticsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('conserva il periodo nella query e restituisce i dati del server', () => {
    const data = {
      dateFrom: '2026-10-01',
      dateTo: '2026-10-10',
      bookings: 3,
      participants: 5,
      presences: 4,
      absences: 1,
      offeredCapacity: 20,
      utilizationRate: 20,
      checkInRate: 80,
      daily: [],
      usage: [],
      mostBookedSpaces: [],
      mostUsedSlots: [],
      reportsByCategory: [],
      reportsByStatus: [],
      history: { trackingStartedAt: null, complete: true, excludedBookings: 0 },
    };
    let result: StatisticsData | undefined;

    api.load(data.dateFrom, data.dateTo).subscribe((value) => (result = value));
    const request = http.expectOne(
      '/api/v1/admin/statistics?dateFrom=2026-10-01&dateTo=2026-10-10',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data });

    expect(result).toEqual(data);
  });

  it('normalizza le liste e la storia omesse dall’API', () => {
    let result: StatisticsData | undefined;
    api.load('2026-10-01', '2026-10-10').subscribe((value) => (result = value));
    http.expectOne(() => true).flush({
      data: { dateFrom: '2026-10-01', dateTo: '2026-10-10', bookings: 0 },
    });

    expect(result?.daily).toEqual([]);
    expect(result?.usage).toEqual([]);
    expect(result?.mostBookedSpaces).toEqual([]);
    expect(result?.mostUsedSlots).toEqual([]);
    expect(result?.reportsByCategory).toEqual([]);
    expect(result?.reportsByStatus).toEqual([]);
    expect(result?.history).toEqual({
      trackingStartedAt: null,
      complete: false,
      excludedBookings: 0,
    });
  });

  it('propaga un errore HTTP alla pagina per il retry', () => {
    let status: number | undefined;
    api.load('2026-10-01', '2026-10-10').subscribe({
      error: (error) => (status = error.status),
    });
    http.expectOne(() => true).flush({}, { status: 503, statusText: 'Offline' });

    expect(status).toBe(503);
  });
});
