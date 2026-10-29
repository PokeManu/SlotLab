import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminReportsApi } from './admin-reports-api';

describe('AdminReportsApi', () => {
  let api: AdminReportsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AdminReportsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('mappa lista, stato e data dal contratto admin', () => {
    let result: unknown;
    api.list().subscribe((reports) => (result = reports));
    http.expectOne('/api/v1/admin/reports').flush({
      data: [
        {
          id: 7,
          spaceName: 'Aula A1',
          category: 'technical',
          description: 'Lampada guasta',
          priority: 'high',
          status: 'in_progress',
          authorEmail: 'utente@example.com',
          photoPath: 'photo.png',
          createdAt: '2026-10-10T22:30:00Z',
        },
      ],
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: 7,
        title: 'technical',
        space: 'Aula A1',
        date: '11/10/2026',
        priorityLabel: 'Alta',
        status: 'in-progress',
        statusLabel: 'In lavorazione',
        photoPath: 'photo.png',
      }),
    ]);
  });

  it('conserva PATCH e converte solo lo stato frontend in in_progress', () => {
    api.updateStatus(7, 'in-progress').subscribe();
    const request = http.expectOne({
      method: 'PATCH',
      url: '/api/v1/admin/reports/7/status',
    });
    expect(request.request.body).toEqual({ status: 'in_progress' });
    request.flush({ data: { status: 'in_progress' } });

    api.updateStatus(7, 'resolved').subscribe();
    const resolved = http.expectOne({
      method: 'PATCH',
      url: '/api/v1/admin/reports/7/status',
    });
    expect(resolved.request.body).toEqual({ status: 'resolved' });
    resolved.flush({ data: { status: 'resolved' } });
  });

  it('carica la foto privata come blob e propaga gli errori', () => {
    let status = 0;
    api.photo(7).subscribe({ error: (error) => (status = error.status) });
    const request = http.expectOne({
      method: 'GET',
      url: '/api/v1/admin/reports/7/photo',
    });
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(), { status: 403, statusText: 'Forbidden' });
    expect(status).toBe(403);
  });
});
