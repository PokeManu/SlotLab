import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminUsersApi } from './admin-users-api';

describe('AdminUsersApi', () => {
  let api: AdminUsersApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AdminUsersApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('conserva pagina, dimensione e ricerca ripulita nella query', () => {
    let pages = 0;
    api.list(2, '  Mario Rossi  ').subscribe((response) => {
      pages = response.pagination.totalPages;
    });
    const request = http.expectOne(
      '/api/v1/admin/users?page=2&size=20&search=Mario+Rossi',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: [], pagination: { totalPages: 4 } });
    expect(pages).toBe(4);

    api.list(1, '   ').subscribe();
    http.expectOne('/api/v1/admin/users?page=1&size=20').flush({
      data: [],
      pagination: { totalPages: 0 },
    });
  });

  it('usa DELETE sull’ID richiesto e propaga gli errori', () => {
    let status: number | undefined;
    api.remove(7).subscribe({ error: (error) => (status = error.status) });
    const request = http.expectOne('/api/v1/admin/users/7');
    expect(request.request.method).toBe('DELETE');
    request.flush({}, { status: 503, statusText: 'Offline' });
    expect(status).toBe(503);
  });
});
