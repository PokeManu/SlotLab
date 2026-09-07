import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { Auth, Account } from './auth';
import { authInterceptor } from './auth-interceptor';
import { sessionGuard, guestGuard } from './session-guard';

describe('Autenticazione frontend HTTP', () => {
  let auth: Auth;
  let http: HttpTestingController;
  let client: HttpClient;
  const user: Account = { id: 1, firstName: 'Anna', lastName: 'Rossi', email: 'anna@example.test', role: 'user' };
  const credentials = { email: user.email, password: 'TestPassword2026!' };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
    ] });
    auth = TestBed.inject(Auth);
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });
  afterEach(() => http.verify());

  function login(account = user) {
    auth.login(credentials).subscribe();
    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ data: { accessToken: 'old-token', user: account } });
  }
  function renew(token = 'new-token') {
    http.expectOne('/api/v1/auth/refresh').flush({ data: { accessToken: token, tokenType: 'Bearer', expiresIn: 1800 } });
    const request = http.expectOne('/api/v1/users/me');
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    request.flush({ data: user });
  }

  it('registra senza login automatico, poi memorizza identita e token soltanto in memoria', () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    auth.register({ ...credentials, firstName: user.firstName, lastName: user.lastName }).subscribe();
    http.expectOne('/api/v1/auth/register').flush({ data: user });
    expect(auth.user()).toBeNull();
    expect(auth.accessToken).toBeNull();
    login();
    expect(auth.user()).toEqual(user);
    expect(auth.initials).toBe('AR');
    expect(storage).not.toHaveBeenCalled();
  });

  it('ripristina il profilo con refresh e users/me al caricamento', () => {
    auth.restore().subscribe();
    renew();
    expect(auth.user()).toEqual(user);
    expect(auth.accessToken).toBe('new-token');
  });

  it('le guard distinguono visitatore, utente e amministratore reali', () => {
    const route = {} as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;
    const session = () => TestBed.runInInjectionContext(() => sessionGuard(route, state));
    const guest = () => TestBed.runInInjectionContext(() => guestGuard(route, state));
    expect(String(session())).toBe('/login');
    expect(guest()).toBe(true);
    login();
    expect(session()).toBe(true);
    expect(String(guest())).toBe('/home');
    login({ ...user, role: 'admin' });
    expect(String(guest())).toBe('/admin');
  });

  it('assenza cookie iniziale non mostra falsi errori; la rete non equivale a sessione scaduta', () => {
    auth.restore().subscribe();
    http.expectOne('/api/v1/auth/refresh').flush({ error: { code: 'REFRESH_TOKEN_MISSING' } }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.notice()).toBe('');
    login();
    auth.recoverSession().subscribe({ error: () => {} });
    http.expectOne('/api/v1/auth/refresh').error(new ProgressEvent('error'));
    expect(auth.user()).toEqual(user);
    expect(auth.notice()).toContain('Connessione');
  });

  it('due 401 condividono un rinnovo e ripetono ogni richiesta una sola volta', () => {
    login();
    client.get('/api/v1/first').subscribe();
    client.get('/api/v1/second').subscribe();
    for (const path of ['first', 'second']) {
      const request = http.expectOne(`/api/v1/${path}`);
      expect(request.request.headers.get('Authorization')).toBe('Bearer old-token');
      request.flush({}, { status: 401, statusText: 'Unauthorized' });
    }
    renew();
    for (const path of ['first', 'second']) {
      const request = http.expectOne(`/api/v1/${path}`);
      expect(request.request.headers.get('Authorization')).toBe('Bearer new-token');
      request.flush({ data: [] });
    }
  });

  it('un 401 tardivo usa il token gia rinnovato senza una seconda rotazione', () => {
    login();
    client.get('/api/v1/early').subscribe();
    client.get('/api/v1/late').subscribe();
    const early = http.expectOne('/api/v1/early');
    const late = http.expectOne('/api/v1/late');
    early.flush({}, { status: 401, statusText: 'Unauthorized' });
    renew();
    http.expectOne('/api/v1/early').flush({});
    late.flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectNone('/api/v1/auth/refresh');
    const retried = http.expectOne('/api/v1/late');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer new-token');
    retried.flush({});
  });

  it('un secondo 401 interrompe il ciclo e torna al login', () => {
    login();
    client.get('/api/v1/private').subscribe({ error: () => {} });
    http.expectOne('/api/v1/private').flush({}, { status: 401, statusText: 'Unauthorized' });
    renew();
    http.expectOne('/api/v1/private').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectNone('/api/v1/auth/refresh');
    expect(auth.user()).toBeNull();
    const navigation = vi.mocked(TestBed.inject(Router).navigateByUrl).mock.calls[0];
    expect(String(navigation[0])).toBe('/login');
    expect(navigation[1]).toEqual({ replaceUrl: true });
  });

  it('sessione sostituita elimina token e profilo; 403 non avvia refresh', () => {
    login();
    client.get('/api/v1/forbidden').subscribe({ error: () => {} });
    http.expectOne('/api/v1/forbidden').flush({}, { status: 403, statusText: 'Forbidden' });
    http.expectNone('/api/v1/auth/refresh');
    client.get('/api/v1/private').subscribe({ error: () => {} });
    http.expectOne('/api/v1/private').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/v1/auth/refresh').flush({ error: { code: 'REFRESH_TOKEN_INVALID' } }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.user()).toBeNull();
    expect(auth.accessToken).toBeNull();
    expect(auth.notice()).toContain('sostituita');
  });

  it('non invia il Bearer a origini esterne o agli endpoint auth', () => {
    login();
    client.get('https://external.example/api/v1/test').subscribe();
    const external = http.expectOne('https://external.example/api/v1/test');
    expect(external.request.headers.has('Authorization')).toBe(false);
    external.flush({});
    auth.login(credentials).subscribe({ error: () => {} });
    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectNone('/api/v1/auth/refresh');
  });

  it('logout fallito conserva lo stato, logout riuscito lo cancella e naviga al login', () => {
    login();
    auth.logout().subscribe({ error: () => {} });
    http.expectOne('/api/v1/auth/logout').error(new ProgressEvent('error'));
    expect(auth.user()).toEqual(user);
    expect(auth.signingOut()).toBe(false);
    auth.logout().subscribe();
    http.expectOne('/api/v1/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    expect(auth.user()).toBeNull();
    expect(auth.accessToken).toBeNull();
  });

  it('un profilo in arrivo dopo logout non ripristina la sessione', () => {
    login();
    auth.recoverSession().subscribe({ error: () => {} });
    http.expectOne('/api/v1/auth/refresh').flush({ data: { accessToken: 'new-token' } });
    const profile = http.expectOne('/api/v1/users/me');
    auth.logout().subscribe();
    http.expectOne('/api/v1/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    profile.flush({ data: user });
    expect(auth.user()).toBeNull();
    expect(auth.accessToken).toBeNull();
  });

  it('non ripete una vecchia richiesta con la sessione di un nuovo login', () => {
    login();
    client.get('/api/v1/test').subscribe({ error: () => {} });
    const previous = http.expectOne('/api/v1/test');
    login({ ...user, id: 2 });
    previous.flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectNone('/api/v1/auth/refresh');
    http.expectNone('/api/v1/test');
    expect(auth.user()?.id).toBe(2);
  });
});
