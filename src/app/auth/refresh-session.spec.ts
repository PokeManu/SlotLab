import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RefreshSession } from './refresh-session';

describe('RefreshSession', () => {
  let service: RefreshSession;
  let http: HttpTestingController;
  const endpoint = '/api/v1/auth/refresh';
  const data = { accessToken: 'test-access', tokenType: 'Bearer', expiresIn: 1800 };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(RefreshSession);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('condivide una sola richiesta tra chiamanti e invia cookie/header', () => {
    const results: unknown[] = [];
    const first = service.refresh();
    const second = service.refresh();
    first.subscribe(value => results.push(value));
    second.subscribe(value => results.push(value));
    const request = http.expectOne(endpoint);
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-SlotLab-Request')).toBe('1');
    expect(request.request.body).toEqual({});
    request.flush({ data });
    expect(results).toEqual([data, data]);
  });

  it('dopo il completamento effettua un nuovo refresh invece di riusare token vecchi', () => {
    const stream = service.refresh();
    stream.subscribe();
    http.expectOne(endpoint).flush({ data });
    stream.subscribe();
    http.expectOne(endpoint).flush({ data: { ...data, accessToken: 'new-test-access' } });
  });

  it('condivide gli errori senza retry automatici e consente un nuovo tentativo esplicito', () => {
    const errors: number[] = [];
    service.refresh().subscribe({ error: error => errors.push(error.status) });
    service.refresh().subscribe({ error: error => errors.push(error.status) });
    http.expectOne(endpoint).flush({ error: { code: 'SESSION_REPLACED' } }, {
      status: 401, statusText: 'Unauthorized',
    });
    expect(errors).toEqual([401, 401]);
    http.expectNone(endpoint);
    service.refresh().subscribe();
    http.expectOne(endpoint).flush({ data });
  });

  it('logout condiviso invia cookie e header senza leggere il refresh in JavaScript', () => {
    let completed = 0;
    service.logout().subscribe({ complete: () => completed++ });
    service.logout().subscribe({ complete: () => completed++ });
    const request = http.expectOne('/api/v1/auth/logout');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-SlotLab-Request')).toBe('1');
    expect(request.request.body).toEqual({});
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBe(2);
  });

  it('logout attende il refresh in corso e impedisce nuovi rinnovi durante la richiesta', () => {
    service.refresh().subscribe();
    const refresh = http.expectOne(endpoint);
    service.logout().subscribe();
    http.expectNone('/api/v1/auth/logout');
    refresh.flush({ data });
    const logout = http.expectOne('/api/v1/auth/logout');
    let blocked = false;
    service.refresh().subscribe({ error: () => { blocked = true; } });
    expect(blocked).toBe(true);
    http.expectNone(endpoint);
    logout.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('logout procede anche se il refresh in attesa fallisce', () => {
    service.refresh().subscribe({ error: () => {} });
    service.logout().subscribe();
    http.expectOne(endpoint).flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/v1/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
  });

  it('errore logout propagato senza retry e nuovo tentativo esplicito possibile', () => {
    let status: number | undefined;
    service.logout().subscribe({ error: error => { status = error.status; } });
    http.expectOne('/api/v1/auth/logout').flush({}, { status: 500, statusText: 'Server Error' });
    expect(status).toBe(500);
    http.expectNone('/api/v1/auth/logout');
    service.logout().subscribe();
    http.expectOne('/api/v1/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
  });

  it('non interrompe una rotazione gia avviata se il primo componente si scollega', () => {
    const subscription = service.refresh().subscribe();
    const request = http.expectOne(endpoint);
    subscription.unsubscribe();
    expect(request.cancelled).toBe(false);
    let received: unknown;
    service.refresh().subscribe(value => { received = value; });
    http.expectNone(endpoint);
    request.flush({ data });
    expect(received).toEqual(data);
  });
});
