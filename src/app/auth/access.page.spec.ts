import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AccessPage } from './access.page';

describe('Form di accesso', () => {
  let http: HttpTestingController;
  function create(mode = 'login') {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { mode }, queryParamMap: convertToParamMap({}) } } },
    ] });
    const fixture = TestBed.createComponent(AccessPage);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    return fixture;
  }
  afterEach(() => http?.verify());
  it('blocca doppio invio e mostra errore credenziali senza rinnovo', () => {
    const fixture = create();
    const page = fixture.componentInstance;
    page.email = ' user@example.test ';
    page.password = 'Password2026!';
    page.submit(); page.submit(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.body.email).toBe('user@example.test');
    request.flush({ error: { code: 'INVALID_CREDENTIALS' } }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Email o password');
    expect(page.busy()).toBe(false);
  });
  it('registrazione rifiuta whitespace e dopo successo rimanda al login', () => {
    const page = create('register').componentInstance;
    page.firstName = ' Anna '; page.lastName = ' Rossi '; page.email = 'anna@example.test';
    page.password = ' Password2026!'; page.submit();
    http.expectNone('/api/v1/auth/register');
    expect(page.error()).toContain('requisiti');
    page.password = 'Password2026!'; page.submit();
    http.expectOne('/api/v1/auth/register').flush({ data: { id: 1 } });
    expect(page.password).toBe('');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login'], { queryParams: { registered: '1' }, replaceUrl: true });
  });
  it('login admin apre dashboard e distingue errore rete', () => {
    const page = create().componentInstance;
    page.email = 'admin@example.test'; page.password = 'Password2026!';
    page.submit();
    http.expectOne('/api/v1/auth/login').error(new ProgressEvent('error'));
    expect(page.error()).toContain('connessione');
    page.submit();
    http.expectOne('/api/v1/auth/login').flush({ data: { accessToken: 'test', user: { id: 1, role: 'admin' } } });
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/admin', { replaceUrl: true });
  });
});
