import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  AdminAvailabilityApi,
  AdminAvailabilityPayload,
  AdminUnavailabilityPayload,
} from './admin-availability-api';

describe('AdminAvailabilityApi', () => {
  let api: AdminAvailabilityApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdminAvailabilityApi,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(AdminAvailabilityApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carica tutti gli spazi usando la paginazione condivisa', () => {
    let spaces: Array<{ id: number; name: string }> | undefined;
    api.listSpaces().subscribe((response) => (spaces = response.data));

    http.expectOne('/api/v1/admin/spaces').flush({
      data: [{ id: 1, name: 'Aula A1' }],
      pagination: { page: 1, totalPages: 2 },
    });
    http.expectOne('/api/v1/admin/spaces?page=2').flush({
      data: [{ id: 21, name: 'Laboratorio B2' }],
      pagination: { page: 2, totalPages: 2 },
    });

    expect(spaces).toEqual([
      { id: 1, name: 'Aula A1' },
      { id: 21, name: 'Laboratorio B2' },
    ]);
  });

  it('mappa le liste dello spazio e conserva gli errori HTTP', () => {
    let availability: unknown;
    let error: unknown;
    api.listAvailability(4).subscribe({
      next: (value) => (availability = value),
      error: (reason) => (error = reason),
    });
    http.expectOne('/api/v1/admin/spaces/4/availability').flush({
      data: [{ availabilityId: 7, validFrom: '2026-11-01' }],
    });
    expect(availability).toEqual([{ availabilityId: 7, validFrom: '2026-11-01' }]);

    api.listUnavailability(4).subscribe({ error: (reason) => (error = reason) });
    http
      .expectOne('/api/v1/admin/spaces/4/unavailability')
      .flush({}, { status: 503, statusText: 'Offline' });
    expect(error).toEqual(expect.objectContaining({ status: 503 }));
  });

  it('conserva URL, metodi e payload delle mutazioni delle fasce', () => {
    const payload: AdminAvailabilityPayload = {
      validFrom: '2026-11-01',
      validUntil: '2026-11-30',
      weekday: 3,
      startTime: '09:00',
      endTime: '12:00',
    };

    api.createAvailability(4, payload).subscribe();
    const create = http.expectOne('/api/v1/admin/spaces/4/availability');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(payload);
    create.flush({});

    api.updateAvailability(4, 7, payload).subscribe();
    const update = http.expectOne('/api/v1/admin/spaces/4/availability/7');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual(payload);
    update.flush({});

    api.reuseAvailability(4, 7, payload).subscribe();
    const reuse = http.expectOne('/api/v1/admin/spaces/4/availability/7/reuse');
    expect(reuse.request.method).toBe('POST');
    expect(reuse.request.body).toEqual(payload);
    reuse.flush({});

    api.retireAvailability(4, 7).subscribe();
    const retire = http.expectOne('/api/v1/admin/spaces/4/availability/7');
    expect(retire.request.method).toBe('DELETE');
    retire.flush({});
  });

  it('conserva URL, metodo e payload delle indisponibilità eccezionali', () => {
    const payload: AdminUnavailabilityPayload = {
      date: '2026-11-05',
      startTime: '10:00',
      endTime: '11:00',
      reason: 'Manutenzione',
    };

    api.createUnavailability(4, payload).subscribe();
    const create = http.expectOne('/api/v1/admin/spaces/4/unavailability');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(payload);
    create.flush({});

    api.removeUnavailability(4, 9).subscribe();
    const remove = http.expectOne('/api/v1/admin/spaces/4/unavailability/9');
    expect(remove.request.method).toBe('DELETE');
    remove.flush({});
  });
});
