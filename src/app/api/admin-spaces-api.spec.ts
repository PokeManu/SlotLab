import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  AdminSpacePayload,
  AdminSpacesApi,
} from './admin-spaces-api';

describe('AdminSpacesApi', () => {
  let api: AdminSpacesApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdminSpacesApi,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(AdminSpacesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carica spazi e pagine successive mantenendo la ricerca codificata', () => {
    let result: unknown;
    api.list(' aula studio ').subscribe((response) => (result = response));

    http.expectOne('/api/v1/admin/spaces?search=aula%20studio').flush({
      data: [{ id: 1, name: 'Aula' }],
      pagination: { page: 1, totalPages: 2 },
    });
    http.expectOne('/api/v1/admin/spaces?search=aula%20studio&page=2').flush({
      data: [{ id: 2, name: 'Studio' }],
      pagination: { page: 2, totalPages: 2 },
    });

    expect(result).toEqual({
      data: [
        { id: 1, name: 'Aula' },
        { id: 2, name: 'Studio' },
      ],
    });
  });

  it('carica gli edifici tramite il contratto paginato', () => {
    let result: unknown;
    api.buildings().subscribe((response) => (result = response));
    http.expectOne('/api/v1/admin/buildings').flush({
      data: [{ id: 6, name: 'Edificio 6' }],
    });
    expect(result).toEqual({ data: [{ id: 6, name: 'Edificio 6' }] });
  });

  it('conserva dettaglio, payload e metodi delle operazioni di modifica', () => {
    const detail = {
      id: 4,
      building: { id: 6 },
      name: 'Laboratorio',
      floor: 2,
      type: 'laboratory',
      capacity: 30,
      accessible: true,
      status: 'active',
      serviceCodes: ['computer'],
    };
    const payload: AdminSpacePayload = {
      buildingId: 6,
      name: 'Laboratorio',
      floor: 2,
      type: 'laboratory',
      capacity: 30,
      accessible: true,
      status: 'active',
      serviceCodes: ['computer'],
    };

    api.detail(4).subscribe();
    http.expectOne('/api/v1/admin/spaces/4').flush({ data: detail });

    api.create(payload).subscribe();
    const create = http.expectOne('/api/v1/admin/spaces');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(payload);
    create.flush({ data: detail });

    api.update(4, payload).subscribe();
    const update = http.expectOne('/api/v1/admin/spaces/4');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual(payload);
    update.flush({ data: detail });

    api.remove(4).subscribe();
    const remove = http.expectOne('/api/v1/admin/spaces/4');
    expect(remove.request.method).toBe('DELETE');
    remove.flush({});
  });
});
