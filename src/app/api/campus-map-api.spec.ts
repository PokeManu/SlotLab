import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CampusMapApi } from './campus-map-api';

describe('CampusMapApi', () => {
  let api: CampusMapApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CampusMapApi,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(CampusMapApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('richiede l\'elenco degli edifici del campus', () => {
    let result: unknown;
    api.listBuildings().subscribe((response) => (result = response));

    http
      .expectOne('/api/v1/buildings')
      .flush({ data: [{ id: 1, number: 10, name: 'Edificio 10' }] });

    expect(result).toEqual({
      data: [{ id: 1, number: 10, name: 'Edificio 10' }],
    });
  });

  it('accorpa tutte le pagine degli spazi', () => {
    let result: unknown;
    api.listSpaces().subscribe((response) => (result = response));

    http.expectOne('/api/v1/spaces?size=100').flush({
      data: [{ id: 1, name: 'Aula A', building: { id: 2 } }],
      pagination: { page: 1, totalPages: 2 },
    });
    http.expectOne('/api/v1/spaces?size=100&page=2').flush({
      data: [{ id: 2, name: 'Aula B', building: { id: 2 } }],
      pagination: { page: 2, totalPages: 2 },
    });

    expect(result).toEqual({
      data: [
        { id: 1, name: 'Aula A', building: { id: 2 } },
        { id: 2, name: 'Aula B', building: { id: 2 } },
      ],
    });
  });
});
