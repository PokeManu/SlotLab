import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminUsersPage } from './admin-users.page';

describe('AdminUsersPage', () => {
  it('aggiorna risultati, paginazione ed errori senza interazioni aggiuntive', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(AdminUsersPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne('/api/v1/admin/users?page=1&size=20').flush({ data: [], pagination: { totalPages: 0 } });
    await fixture.whenStable();
    fixture.componentInstance.search = 'Mario';
    fixture.componentInstance.onSearch();
    http.expectOne('/api/v1/admin/users?page=1&size=20&search=Mario').flush({ data: [{ id: 1, firstName: 'Mario', lastName: 'Rossi', email: 'mario@example.test', role: 'user' }], pagination: { totalPages: 2 } });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.table strong')?.textContent).toContain('Mario Rossi');
    expect(fixture.nativeElement.querySelector('.pagination').textContent).toContain('Pagina 1 di 2');
    fixture.componentInstance.nextPage();
    http.expectOne('/api/v1/admin/users?page=2&size=20&search=Mario').flush({}, { status: 500, statusText: 'Internal Server Error' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('Impossibile caricare');
    http.verify();
  });
});
