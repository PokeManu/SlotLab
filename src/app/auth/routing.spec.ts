import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { Auth, UserRole } from './auth';
import { AccessPage } from './access.page';
import { returnDestination } from './return-url';
import { TopbarComponent } from '../topbar-component/topbar-component.component';
import { MobileNavigationComponent } from '../mobile-navigation/mobile-navigation.component';

@Component({ template: '<h1>Pagina riservata</h1>' })
class PrivatePage {}

describe('Route reali e destinazioni dopo accesso', () => {
  let router: Router;
  let http: HttpTestingController;
  beforeEach(() => {
    // Manteniamo configurazione e guard reali; isoliamo solo i contenuti delle pagine.
    const testRoutes = routes.map(route => route.data?.['access']
      ? { ...route, loadComponent: () => Promise.resolve(PrivatePage) } : route);
    TestBed.configureTestingModule({ providers: [provideRouter(testRoutes), provideHttpClient(), provideHttpClientTesting()] });
    router = TestBed.inject(Router);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function respondLogin(role: UserRole) {
    http.expectOne('/api/v1/auth/login').flush({ data: { accessToken: 'test-token', user: {
      id: 1, firstName: 'Anna', lastName: 'Rossi', email: 'anna@example.test', role,
    } } });
  }
  function login(role: UserRole) {
    TestBed.inject(Auth).login({ email: 'anna@example.test', password: 'TestPassword2026!' }).subscribe();
    respondLogin(role);
  }

  it('non ha duplicati e tutte le pagine riservate respingono i visitatori conservando la destinazione', async () => {
    expect(new Set(routes.map(route => route.path)).size).toBe(routes.length);
    const harness = await RouterTestingHarness.create();
    for (const route of routes.filter(route => route.data?.['access'])) {
      const url = '/' + route.path!.replace(/:[^/]+/g, '12');
      await harness.navigateByUrl(url);
      const result = router.parseUrl(router.url);
      expect(result.root.children['primary'].segments[0].path).toBe('login');
      expect(result.queryParams['returnUrl']).toBe(url);
      expect(harness.routeNativeElement?.textContent).not.toContain('Pagina riservata');
    }
  });

  for (const role of ['user', 'admin'] as const) {
    it(`separa tutte le pagine per ${role}, incluso admin/bookings e accessi diretti`, async () => {
      login(role);
      const harness = await RouterTestingHarness.create();
      for (const route of routes.filter(route => route.data?.['access'])) {
        const url = '/' + route.path!.replace(/:[^/]+/g, '12');
        await harness.navigateByUrl(url);
        const allowed = route.data!['access'] === role || route.data!['access'] === 'authenticated';
        expect(router.url).toBe(allowed ? url : role === 'admin' ? '/admin' : '/home');
      }
      for (const url of ['/', '/inesistente', '/login', '/register']) {
        await harness.navigateByUrl(url);
        expect(router.url).toBe(role === 'admin' ? '/admin' : '/home');
      }
    });
  }

  it('visitatore su root o indirizzo sconosciuto arriva al login', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(router.url).toBe('/login');
    await harness.navigateByUrl('/inesistente');
    expect(router.url).toBe('/login');
  });

  it('rifiuta ritorni esterni, pubblici, sconosciuti, outlet secondari e ruoli incompatibili', () => {
    for (const value of ['https://example.test', '//example.test', '/\\example.test', '/login', '/register',
      '/inesistente', '/home(aux:profile)', '/home;role=admin', '/%2F%2Fexample', '/check-in/0', '/check-in/no', '/%']) {
      expect(returnDestination(router, value)).toBeNull();
    }
    expect(returnDestination(router, '/admin/bookings', 'user')).toBeNull();
    expect(returnDestination(router, '/check-in/12', 'admin')).toBeNull();
    expect(String(returnDestination(router, '/spaces/12?date=2026-09-07#slots', 'user')))
      .toBe('/spaces/12?date=2026-09-07#slots');
  });

  it('conserva il QR anche passando da registrazione, poi il login torna allo spazio richiesto', async () => {
    const harness = await RouterTestingHarness.create('/check-in/12');
    const registerUrl = router.createUrlTree(['/register'], { queryParams: router.parseUrl(router.url).queryParams });
    const register = await harness.navigateByUrl(router.serializeUrl(registerUrl), AccessPage);
    register.firstName = 'Anna'; register.lastName = 'Rossi'; register.email = 'anna@example.test'; register.password = 'TestPassword2026!'; register.passwordConfirmation = 'TestPassword2026!';
    register.submit();
    http.expectOne('/api/v1/auth/register').flush({ data: { id: 1 } });
    await harness.fixture.whenStable();
    expect(router.parseUrl(router.url).queryParams).toEqual({ returnUrl: '/check-in/12', registered: '1' });
    const page = harness.routeDebugElement!.componentInstance as AccessPage;
    page.email = 'anna@example.test'; page.password = 'TestPassword2026!'; page.submit();
    respondLogin('user');
    await harness.fixture.whenStable();
    expect(router.url).toBe('/check-in/12');
    http.expectNone('/api/v1/spaces/12/check-in');
  });

  it('un login admin ignora un ritorno QR riservato agli utenti', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/login?returnUrl=%2Fcheck-in%2F12', AccessPage);
    page.email = 'anna@example.test'; page.password = 'TestPassword2026!'; page.submit();
    respondLogin('admin');
    await harness.fixture.whenStable();
    expect(router.url).toBe('/admin');
  });

  it('un form conservato usa la destinazione corrente anche con snapshot vecchio', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/login', AccessPage);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/login?returnUrl=%2Fcheck-in%2F12&registered=1');
    expect(page.returnQuery).toEqual({ returnUrl: '/check-in/12' });
    expect(page.registered()).toBe(true);
  });

  it('dopo logout un vecchio indirizzo privato richiede nuovamente accesso', async () => {
    login('user');
    const harness = await RouterTestingHarness.create('/profile');
    TestBed.inject(Auth).logout().subscribe();
    http.expectOne('/api/v1/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    await harness.fixture.whenStable();
    await harness.navigateByUrl('/bookings');
    expect(router.parseUrl(router.url).queryParams['returnUrl']).toBe('/bookings');
    expect(harness.routeNativeElement?.textContent).not.toContain('Pagina riservata');
  });

  it('le barre condivise mostrano soltanto i collegamenti del ruolo corrente', () => {
    login('admin');
    const topbar = TestBed.createComponent(TopbarComponent);
    const mobile = TestBed.createComponent(MobileNavigationComponent);
    for (const fixture of [topbar, mobile]) {
      fixture.detectChanges();
      const links = [...fixture.nativeElement.querySelectorAll('a')].map((a: any) => a.getAttribute('href'));
      expect(links).toContain('/admin/bookings');
      expect(links).toContain('/profile');
      expect(links).not.toContain('/favorites');
      expect(links).not.toContain('/notifications');
      login('user'); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('a[href="/admin/bookings"]')).toBeNull();
      login('admin');
    }
  });
});
