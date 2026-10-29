import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminBuildingsApi, AdminBuildingPayload } from './admin-buildings-api';

describe('AdminBuildingsApi', () => {
  let api: AdminBuildingsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdminBuildingsApi,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(AdminBuildingsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('mappa la lista dal contratto data', () => {
    const building = {
      id: 2,
      number: 7,
      name: 'Edificio 7',
      address: 'Campus',
      latitude: 38.11,
      longitude: 13.36,
    };
    let result: typeof building[] | undefined;

    api.list().subscribe((buildings) => (result = buildings));
    http.expectOne('/api/v1/admin/buildings').flush({ data: [building] });

    expect(result).toEqual([building]);
  });

  it('conserva payload e metodo per creazione e modifica', () => {
    const payload: AdminBuildingPayload = {
      number: 7,
      name: 'Edificio 7',
      address: 'Campus',
      latitude: 38.11,
      longitude: 13.36,
    };

    api.create(payload).subscribe();
    const create = http.expectOne('/api/v1/admin/buildings');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(payload);
    create.flush({ data: { id: 7 } });

    api.update(7, payload).subscribe();
    const update = http.expectOne('/api/v1/admin/buildings/7');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual(payload);
    update.flush({ data: { id: 7 } });
  });

  it('usa DELETE sull’identificativo richiesto', () => {
    api.remove(7).subscribe();
    const request = http.expectOne('/api/v1/admin/buildings/7');
    expect(request.request.method).toBe('DELETE');
    request.flush({});
  });

  it('propaga gli errori HTTP senza trasformare il contratto', () => {
    let error: unknown;
    api.list().subscribe({ error: (reason) => (error = reason) });
    const request = http.expectOne('/api/v1/admin/buildings');
    request.flush({ message: 'offline' }, { status: 503, statusText: 'Offline' });

    expect(error).toEqual(
      expect.objectContaining({ status: 503, statusText: 'Offline' }),
    );
  });
});
