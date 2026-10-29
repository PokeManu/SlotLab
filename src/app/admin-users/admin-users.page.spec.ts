import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AdminUsersPage } from './admin-users.page';
describe('AdminUsersPage', () => {
  afterEach(() => vi.restoreAllMocks());
  it('aggiorna risultati, paginazione ed errori senza interazioni aggiuntive', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const fixture = TestBed.createComponent(AdminUsersPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
    http
      .expectOne('/api/v1/admin/users?page=1&size=20')
      .flush({ data: [], pagination: { totalPages: 0 } });
    await fixture.whenStable();
    fixture.componentInstance.search = 'Mario';
    fixture.componentInstance.onSearch();
    http
      .expectOne('/api/v1/admin/users?page=1&size=20&search=Mario')
      .flush({
        data: [
          {
            id: 1,
            firstName: 'Mario',
            lastName: 'Rossi',
            email: 'mario@example.test',
            role: 'user',
          },
        ],
        pagination: { totalPages: 2 },
      });
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('.table strong')?.textContent,
    ).toContain('Mario Rossi');
    expect(
      fixture.nativeElement.querySelector('.pagination').textContent,
    ).toContain('Pagina 1 di 2');
    fixture.componentInstance.nextPage();
    http
      .expectOne('/api/v1/admin/users?page=2&size=20&search=Mario')
      .flush({}, { status: 500, statusText: 'Internal Server Error' });
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('[role="alert"]')?.textContent,
    ).toContain('Impossibile caricare');
    http.verify();
  });
  it('usa ion-searchbar e ignora la ricerca superata, mantenendo il retry', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const fixture = TestBed.createComponent(AdminUsersPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/v1/admin/users?page=1&size=20')
      .flush({ data: [], pagination: { totalPages: 0 } });
    const searchbar = fixture.nativeElement.querySelector('ion-searchbar') as HTMLIonSearchbarElement;
    searchbar.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'Prima' } }));
    const first = http.expectOne('/api/v1/admin/users?page=1&size=20&search=Prima');
    searchbar.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'Seconda' } }));
    expect(first.cancelled).toBe(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ion-spinner')).not.toBeNull();
    http.expectOne('/api/v1/admin/users?page=1&size=20&search=Seconda')
      .flush({ data: [{
        id: 2, firstName: 'Seconda', lastName: 'Persona',
        email: 'seconda@example.test', role: 'user',
      }], pagination: { totalPages: 1 } });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Seconda Persona');
    expect(fixture.nativeElement.textContent).not.toContain('Prima Persona');
    fixture.componentInstance.loadUsers();
    http.expectOne('/api/v1/admin/users?page=1&size=20&search=Seconda')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.table')).toBeNull();
    fixture.nativeElement.querySelector('ion-button').click();
    http.expectOne('/api/v1/admin/users?page=1&size=20&search=Seconda')
      .flush({ data: [], pagination: { totalPages: 0 } });
    http.verify();
  });
  it('blocca una seconda eliminazione mentre la prima richiesta è in corso', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(AdminUsersPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const user = {
      id: 7,
      firstName: 'Mario',
      lastName: 'Rossi',
      email: 'mario@example.test',
      role: 'user' as const,
      createdAt: '2026-10-10T10:00:00Z',
    };
    http.expectOne('/api/v1/admin/users?page=1&size=20').flush({
      data: [user], pagination: { totalPages: 1 },
    });
    fixture.componentInstance.remove(user);
    fixture.componentInstance.remove(user);
    fixture.detectChanges();
    expect(fixture.componentInstance.confirmingUser).toEqual(user);
    fixture.componentInstance.deleteAlertButtons[1].handler?.();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ion-searchbar').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.row ion-button').disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Eliminazione account in corso');
    const deletion = http.expectOne('/api/v1/admin/users/7');
    expect(deletion.request.method).toBe('DELETE');
    deletion.flush({});
    http.expectOne('/api/v1/admin/users?page=1&size=20').flush({
      data: [], pagination: { totalPages: 0 },
    });
    await fixture.whenStable();
    expect(fixture.componentInstance.deletingId).toBeNull();
    http.verify();
  });
  it('espone semantica tabellare, stato occupato e pagina annunciata', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(AdminUsersPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const main = fixture.nativeElement.querySelector('main') as HTMLElement;
    expect(main.getAttribute('aria-busy')).toBe('true');
    http.expectOne('/api/v1/admin/users?page=1&size=20').flush({
      data: [{ id: 1, firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.test', role: 'user' }],
      pagination: { totalPages: 2 },
    });
    await fixture.whenStable();
    fixture.detectChanges();
    const table = fixture.nativeElement.querySelector('[role="table"]') as HTMLElement;
    expect(main.getAttribute('aria-busy')).toBe('false');
    expect(table.querySelector('[role="columnheader"]')?.textContent).toContain('Nome');
    expect(table.querySelector('[role="row"] [role="cell"]')?.textContent).toContain('Ada Lovelace');
    expect(fixture.nativeElement.querySelector('[aria-live="polite"]')?.textContent).toContain('Pagina 1 di 2');
    http.verify();
  });
});
