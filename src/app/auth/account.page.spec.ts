import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { AccountPage } from './account.page';
import { Auth } from './auth';

describe('Gestione credenziali e account', () => {
  let http: HttpTestingController;
  function create(mode: string) {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { mode } } } }] });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AccountPage); fixture.detectChanges();
    return fixture;
  }
  function login() {
    TestBed.inject(Auth).login({ email: 'test@example.test', password: 'TestPassword2026!' }).subscribe();
    http.expectOne('/api/v1/auth/login').flush({ data: { accessToken: 'token', user: { id: 1, firstName: 'Test', lastName: 'User', role: 'user' } } });
  }
  afterEach(() => http.verify());
  it('recupero normalizza email, impedisce doppio invio e mostra risposta uniforme', () => {
    const fixture = create('forgot'), page = fixture.componentInstance;
    page.email = 'bad'; page.submit(); http.expectNone('/api/v1/auth/forgot-password');
    page.email = ' TEST@example.test '; page.submit(); page.submit(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
    const request = http.expectOne('/api/v1/auth/forgot-password');
    expect(request.request.body).toEqual({ email: 'test@example.test' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(page.sent()).toBe(true);
  });
  it('cambio password verifica conferma e conserva stato in caso di password errata', () => {
    const page = create('password').componentInstance; login();
    page.currentPassword = 'TestPassword2026!'; page.newPassword = 'Changed2026!'; page.confirmation = 'different';
    page.submit(); http.expectNone('/api/v1/users/me/password');
    page.confirmation = page.newPassword; page.submit();
    http.expectOne('/api/v1/users/me/password').flush({ error: { code: 'CURRENT_PASSWORD_INVALID' } }, { status: 400, statusText: 'Bad Request' });
    expect(page.error()).toContain('corrente'); expect(TestBed.inject(Auth).user()).not.toBeNull();
    page.submit(); http.expectOne('/api/v1/users/me/password').flush(null, { status: 204, statusText: 'No Content' });
    expect(TestBed.inject(Auth).accessToken).toBeNull(); expect(page.currentPassword).toBe('');
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
  });
  it('eliminazione richiede conferma e password; errore rete conserva account e consente retry', () => {
    const page = create('delete').componentInstance; login();
    page.currentPassword = 'TestPassword2026!'; page.submit(); http.expectNone('/api/v1/users/me');
    page.confirmed = true; page.submit();
    const request = http.expectOne('/api/v1/users/me');
    expect(request.request.method).toBe('DELETE');
    request.error(new ProgressEvent('error'));
    expect(TestBed.inject(Auth).user()).not.toBeNull();
    page.submit(); http.expectOne('/api/v1/users/me').flush(null, { status: 204, statusText: 'No Content' });
    expect(TestBed.inject(Auth).user()).toBeNull();
  });
  it('aspetta un rinnovo in corso prima di cambiare password e impedisce nuovi login concorrenti', () => {
    const page = create('password').componentInstance; login();
    const auth = TestBed.inject(Auth);
    auth.recoverSession().subscribe();
    page.currentPassword = 'TestPassword2026!'; page.newPassword = page.confirmation = 'Changed2026!'; page.submit();
    http.expectNone('/api/v1/users/me/password');
    auth.login({ email: 'other@example.test', password: 'Other2026!' }).subscribe({ error: () => {} });
    http.expectNone('/api/v1/auth/login');
    http.expectOne('/api/v1/auth/refresh').flush({ data: { accessToken: 'fresh-token' } });
    http.expectOne('/api/v1/users/me').flush({ data: { id: 1, role: 'user' } });
    const request = http.expectOne('/api/v1/users/me/password');
    expect(request.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(auth.user()).toBeNull();
  });
});
