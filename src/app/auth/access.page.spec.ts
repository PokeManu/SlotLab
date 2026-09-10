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
    const fixture = create('register');
    const page = fixture.componentInstance;
    page.firstName = ' Anna '; page.lastName = ' Rossi '; page.email = 'anna@example.test';
    page.password = ' Password2026!'; page.submit();
    http.expectNone('/api/v1/auth/register');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.access__requirements').textContent).toContain('spazi');
    expect(fixture.nativeElement.querySelector('[name=password]').classList).toContain('access__input--invalid');
    page.password = 'Password2026!'; page.passwordConfirmation = 'Password2026!'; page.submit();
    http.expectOne('/api/v1/auth/register').flush({ data: { id: 1 } });
    expect(page.password).toBe('');
    expect(page.passwordConfirmation).toBe('');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login'], { queryParams: { registered: '1' }, replaceUrl: true });
  });
  it('nasconde inizialmente i requisiti e blocca password diverse', async () => {
    const fixture = create('register');
    const page = fixture.componentInstance;
    expect(fixture.nativeElement.querySelector('.access__requirements')).toBeNull();
    page.firstName = 'Anna'; page.lastName = 'Rossi'; page.email = 'anna@example.test';
    await fixture.whenStable();
    const passwordInput = fixture.nativeElement.querySelector('[name=password]') as HTMLInputElement;
    const confirmationInput = fixture.nativeElement.querySelector('[name=passwordConfirmation]') as HTMLInputElement;
    passwordInput.value = 'Password2026!';
    passwordInput.dispatchEvent(new Event('input'));
    confirmationInput.value = 'Password2025!';
    confirmationInput.dispatchEvent(new Event('input'));
    confirmationInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[name=passwordConfirmation]').getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.querySelector('.access__field-error').textContent).toContain('non coincidono');
    page.submit();
    http.expectNone('/api/v1/auth/register');
  });
  it('mostra e nasconde separatamente password e conferma senza inviare il form', () => {
    const fixture = create('register');
    const toggles = fixture.nativeElement.querySelectorAll('.access__password-toggle') as NodeListOf<HTMLButtonElement>;
    const password = fixture.nativeElement.querySelector('[name=password]') as HTMLInputElement;
    const confirmation = fixture.nativeElement.querySelector('[name=passwordConfirmation]') as HTMLInputElement;
    expect(toggles.length).toBe(2);
    expect(password.type).toBe('password');
    expect(confirmation.type).toBe('password');
    toggles[0].click();
    fixture.detectChanges();
    expect(password.type).toBe('text');
    expect(confirmation.type).toBe('password');
    expect(toggles[0].getAttribute('aria-label')).toBe('Nascondi password');
    toggles[0].click();
    toggles[1].click();
    fixture.detectChanges();
    expect(password.type).toBe('password');
    expect(confirmation.type).toBe('text');
    http.expectNone('/api/v1/auth/register');
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
