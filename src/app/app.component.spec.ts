import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AppComponent } from './app.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { Auth, Account } from './auth/auth';
import { NotificationState } from './notifications/notification-state';
import { ProfilePhoto } from './profile/profile-photo';

@Component({
  standalone: true,
  template: '<p data-testid="user-page">Pagina utente</p>',
})
class UserRouteStubComponent {}

@Component({
  standalone: true,
  template: '<p data-testid="admin-page">Pagina admin</p>',
})
class AdminRouteStubComponent {}

const user: Account = {
  id: 1,
  firstName: 'Anna',
  lastName: 'Rossi',
  email: 'anna@example.test',
  role: 'user',
};

function createAuthStub() {
  const currentUser = signal<Account | null>(null);
  return {
    user: currentUser.asReadonly(),
    notice: signal(''),
    get role() {
      return currentUser()?.role ?? null;
    },
    signingOut: signal(false),
    isAdmin: () => currentUser()?.role === 'admin',
    get initials() {
      return `${currentUser()?.firstName[0] ?? ''}${currentUser()?.lastName[0] ?? ''}`.toUpperCase();
    },
    get homePath() {
      return currentUser()?.role === 'admin' ? '/admin' : '/home';
    },
    userSignal: currentUser,
  };
}

describe('AppComponent layout shell', () => {
  let fixture: ComponentFixture<AppComponent>;
  let router: Router;
  let auth: ReturnType<typeof createAuthStub>;

  beforeEach(async () => {
    auth = createAuthStub();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([
          { path: 'home', component: UserRouteStubComponent },
          { path: 'admin', component: AdminRouteStubComponent },
          { path: 'login', component: UserRouteStubComponent },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Auth, useValue: auth },
        {
          provide: ProfilePhoto,
          useValue: { url: signal(''), load: () => of(undefined) },
        },
        {
          provide: NotificationState,
          useValue: {
            unreadCount: signal(0),
            refresh: () => undefined,
            set: () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('crea un solo outlet centrale e mantiene il layout fullscreen per gli ospiti', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('ion-router-outlet')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('#app-shell')).toBeTruthy();
    expect(fixture.componentInstance.layout()).toBe('fullscreen');
    expect(fixture.nativeElement.querySelector('app-topbar')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-mobile-navigation')).toBeNull();
  });

  it('mostra header e footer condivisi quando l’utente raggiunge una sezione principale', async () => {
    auth.userSignal.set(user);
    await router.navigateByUrl('/home');
    fixture.detectChanges();

    expect(fixture.componentInstance.layout()).toBe('user');
    expect(fixture.nativeElement.querySelector('app-topbar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-mobile-navigation')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('ion-footer')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="user-page"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('ion-menu')).toBeTruthy();
  });

  it('mostra il menu amministratore e rimuove il footer utente nel layout admin', async () => {
    auth.userSignal.set({ ...user, role: 'admin' });
    await router.navigateByUrl('/admin');
    fixture.detectChanges();

    expect(fixture.componentInstance.layout()).toBe('admin');
    expect(fixture.nativeElement.querySelector('.app-shell--admin')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-admin-sidebar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.app-shell__admin-header')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-topbar')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-mobile-navigation')).toBeNull();
    expect(fixture.nativeElement.querySelector('ion-footer')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="admin-page"]')).toBeTruthy();
  });
});
