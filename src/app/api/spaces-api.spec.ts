import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { SpacesApi } from './spaces-api';
import { SpaceSummary } from '../models/space-summary.model';

describe('SpacesApi', () => {
  let api: SpacesApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(SpacesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('mappa gli spazi consigliati senza modificare l’endpoint', () => {
    let result: SpaceSummary[] | undefined;
    api.recommended().subscribe((spaces) => (result = spaces));
    http.expectOne('/api/v1/spaces/recommended').flush({
      data: [
        {
          id: 4,
          name: 'Laboratorio 4',
          type: 'laboratory',
          building: { name: 'Edificio 2' },
          floor: 1,
          capacity: 18,
        },
      ],
    });
    expect(result).toEqual([
      {
        id: '4',
        name: 'Laboratorio 4',
        type: 'Laboratorio',
        building: 'Edificio 2',
        floor: 1,
        seats: 18,
        image: '/assets/images/AulaStudioA1.jpg',
      },
    ]);
  });

  it('conserva filtri, paginazione e stato negli spazi cercati', () => {
    let result: unknown;
    api
      .list({
        search: 'studio',
        availableNow: true,
        accessible: true,
        studyRooms: true,
        minimumSeats: true,
      })
      .subscribe((spaces) => (result = spaces));
    const base =
      '/api/v1/spaces?search=studio&availableNow=true&accessible=true&type=study_room&minSeats=10';
    http.expectOne(base).flush({
      data: [
        {
          id: 1,
          name: 'Aula Studio A1',
          type: 'study_room',
          building: { name: 'Edificio 1' },
          floor: 2,
          capacity: 20,
          status: 'active',
        },
      ],
      pagination: { page: 1, totalPages: 2 },
    });
    http.expectOne(`${base}&page=2`).flush({
      data: [
        {
          id: 2,
          name: 'Aula Studio A2',
          type: 'study_room',
          building: { name: 'Edificio 1' },
          floor: 3,
          capacity: 16,
          status: 'maintenance',
        },
      ],
      pagination: { page: 2, totalPages: 2 },
    });
    expect(result).toMatchObject([
      { id: '1', type: 'Aula studio', status: 'active' },
      { id: '2', type: 'Aula studio', status: 'maintenance' },
    ]);
  });

  it('lascia al componente la gestione degli errori di rete', () => {
    let status = 0;
    api.recommended().subscribe({
      error: (error) => (status = error.status),
    });
    http
      .expectOne('/api/v1/spaces/recommended')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(status).toBe(503);
  });

  it('condivide dettaglio e disponibilità senza cambiare URL o valori', () => {
    let detail: unknown;
    let slots: unknown;
    api.detail('7').subscribe((value) => (detail = value));
    http.expectOne('/api/v1/spaces/7').flush({
      data: {
        id: 7,
        name: 'Aula 7',
        building: { name: 'Edificio 2' },
        floor: 1,
        type: 'study_room',
        capacity: 12,
        accessible: true,
        services: ['wifi'],
        status: 'maintenance',
      },
    });
    expect(detail).toMatchObject({
      space: {
        id: '7',
        name: 'Aula 7',
        type: 'Aula studio',
        image: '/assets/images/AulaStudioA1.jpg',
        services: ['wifi'],
      },
      status: 'maintenance',
    });
    api.availability('7', '2026-10-10').subscribe((value) => (slots = value));
    http.expectOne('/api/v1/spaces/7/availability?date=2026-10-10').flush({
      data: [{ availabilityId: 3, bookable: true, availableSeats: 5, startTime: '08:00', endTime: '09:00' }],
    });
    expect(slots).toMatchObject([{ availabilityId: 3, availableSeats: 5 }]);
  });

  it('centralizza preferiti, mapping e mutazioni conservando i metodi HTTP', () => {
    let spaces: unknown;
    let ids: unknown;
    api.favorites().subscribe((value) => (spaces = value));
    http.expectOne('/api/v1/favorites').flush({
      data: [{ id: 4, name: 'Sala', type: 'meeting_room', building: { name: 'Edificio 1' }, floor: 0, capacity: 6, status: 'active' }],
    });
    expect(spaces).toMatchObject([{ id: '4', availabilityTone: 'available' }]);
    api.favoriteIds().subscribe((value) => (ids = value));
    http.expectOne('/api/v1/favorites').flush({ data: [{ id: 4 }] });
    expect(ids).toEqual(['4']);
    api.addFavorite('4').subscribe();
    const add = http.expectOne('/api/v1/favorites/4');
    expect(add.request.method).toBe('POST');
    expect(add.request.body).toEqual({});
    add.flush(null, { status: 204, statusText: 'No Content' });
    api.removeFavorite('4').subscribe();
    const remove = http.expectOne('/api/v1/favorites/4');
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null, { status: 204, statusText: 'No Content' });
  });
});
