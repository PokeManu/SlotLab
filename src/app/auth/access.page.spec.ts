import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AccessPage } from './access.page';
describe('Form di accesso', () => {
  let http: HttpTestingController;
  function create(mode = 'login') {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { mode }, queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AccessPage);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    return fixture;
  }
  afterEach(() => http?.verify());
  it('mostra il logo ufficiale nella schermata di accesso', () => {
    const fixture = create();
    const logo = fixture.nativeElement.querySelector(
      '.access__brand img',
    ) as HTMLImageElement;
    expect(logo.getAttribute('src')).toBe('assets/branding/slotlab-logo.png');
  });
  it('blocca doppio invio e mostra errore credenziali senza rinnovo', () => {
    const fixture = create();
    const page = fixture.componentInstance;
    page.email = ' user@example.test ';
    page.password = 'Password2026!';
    page.submit();
    page.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
    expect(page.form.disabled).toBe(true);
    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.body.email).toBe('user@example.test');
    request.flush(
      { error: { code: 'INVALID_CREDENTIALS' } },
      { status: 401, statusText: 'Unauthorized' },
    );
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[role=alert]').textContent,
    ).toContain('Email o password');
    expect(page.busy()).toBe(false);
    expect(page.form.enabled).toBe(true);
  });
  it('registrazione rifiuta whitespace e dopo successo rimanda al login', () => {
    const fixture = create('register');
    const page = fixture.componentInstance;
    page.firstName = ' Anna ';
    page.lastName = ' Rossi ';
    page.email = 'anna@example.test';
    page.password = ' Password2026!';
    page.submit();
    http.expectNone('/api/v1/auth/register');
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.access__requirements').textContent,
    ).toContain('spazi');
    expect(
      fixture.nativeElement.querySelector('[name=password]').classList,
    ).toContain('access__input--invalid');
    page.password = 'Password2026!';
    page.passwordConfirmation = 'Password2026!';
    page.submit();
    const request = http.expectOne('/api/v1/auth/register');
    expect(request.request.body).toEqual({
      firstName: 'Anna',
      lastName: 'Rossi',
      email: 'anna@example.test',
      password: 'Password2026!',
    });
    request.flush({ data: { id: 1 } });
    expect(page.password).toBe('');
    expect(page.passwordConfirmation).toBe('');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { registered: '1' },
      replaceUrl: true,
    });
  });
  it('nasconde inizialmente i requisiti e blocca password diverse', async () => {
    const fixture = create('register');
    const page = fixture.componentInstance;
    expect(
      fixture.nativeElement.querySelector('.access__requirements'),
    ).toBeNull();
    page.firstName = 'Anna';
    page.lastName = 'Rossi';
    page.email = 'anna@example.test';
    await fixture.whenStable();
    const passwordInput = fixture.nativeElement.querySelector(
      '[name=password]',
    ) as HTMLIonInputElement;
    const confirmationInput = fixture.nativeElement.querySelector(
      '[name=passwordConfirmation]',
    ) as HTMLIonInputElement;
    passwordInput.value = 'Password2026!';
    passwordInput.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'Password2026!' } }));
    confirmationInput.value = 'Password2025!';
    confirmationInput.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'Password2025!' } }));
    confirmationInput.dispatchEvent(new CustomEvent('ionBlur'));
    fixture.detectChanges();
    expect(page.form.controls.password.value).toBe('Password2026!');
    expect(page.form.hasError('passwordMismatch')).toBe(true);
    expect(
      fixture.nativeElement
        .querySelector('[name=passwordConfirmation]')
        .getAttribute('aria-invalid'),
    ).toBe('true');
    expect(
      fixture.nativeElement.querySelector('.access__field-error').textContent,
    ).toContain('non coincidono');
    page.submit();
    http.expectNone('/api/v1/auth/register');
  });
  it('mostra e nasconde separatamente password e conferma senza inviare il form', () => {
    const fixture = create('register');
    const toggles = fixture.nativeElement.querySelectorAll(
      '.access__password-toggle',
    ) as NodeListOf<HTMLButtonElement>;
    const password = fixture.nativeElement.querySelector(
      '[name=password]',
    ) as HTMLInputElement;
    const confirmation = fixture.nativeElement.querySelector(
      '[name=passwordConfirmation]',
    ) as HTMLInputElement;
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
    page.email = 'admin@example.test';
    page.password = 'Password2026!';
    page.submit();
    http.expectOne('/api/v1/auth/login').error(new ProgressEvent('error'));
    expect(page.error()).toContain('connessione');
    page.submit();
    http
      .expectOne('/api/v1/auth/login')
      .flush({ data: { accessToken: 'test', user: { id: 1, role: 'admin' } } });
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith(
      '/admin',
      { replaceUrl: true },
    );
  });
  it('usa il FormGroup per bloccare email invalide e campi obbligatori', () => {
    const fixture = create('register');
    const page = fixture.componentInstance;
    expect(page.form.invalid).toBe(true);
    page.firstName = 'Anna';
    page.lastName = 'Rossi';
    page.email = 'indirizzo-errato';
    page.password = 'Password2026!';
    page.passwordConfirmation = 'Password2026!';
    expect(page.form.controls.email.hasError('email')).toBe(true);
    page.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[name=email]').getAttribute('aria-invalid')).toBe('true');
    http.expectNone('/api/v1/auth/register');
    page.email = ' ANNA@EXAMPLE.TEST ';
    expect(page.form.valid).toBe(true);
    page.submit();
    http.expectOne('/api/v1/auth/register').flush({ data: { id: 1 } });
  });
});
