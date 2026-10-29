import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CheckInApi } from './check-in-api';

describe('CheckInApi', () => {
  let api: CheckInApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(CheckInApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('centralizza endpoint, metodo e payload del check-in QR', () => {
    let response: unknown;
    api.verify('12').subscribe((value) => (response = value));

    const request = http.expectOne('/api/v1/spaces/12/check-in');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({
      data: {
        result: 'checked_in',
        message: 'Accesso consentito',
        checkedInAt: '2026-09-08T08:00:00Z',
      },
    });

    expect(response).toEqual({
      data: {
        result: 'checked_in',
        message: 'Accesso consentito',
        checkedInAt: '2026-09-08T08:00:00Z',
      },
    });
  });

  it('propaga gli errori al componente che gestisce il messaggio utente', () => {
    let status = 0;
    api.verify('12').subscribe({ error: (error) => (status = error.status) });
    http
      .expectOne('/api/v1/spaces/12/check-in')
      .flush({ error: { message: 'Il check-in è scaduto.' } }, { status: 409, statusText: 'Conflict' });

    expect(status).toBe(409);
  });
});
