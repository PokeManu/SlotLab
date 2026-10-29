import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReportsApi } from './reports-api';

describe('ReportsApi', () => {
  let api: ReportsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ReportsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('mappa lo storico conservando categorie, stato e data', () => {
    let result: unknown;
    api.list().subscribe((reports) => (result = reports));
    http.expectOne('/api/v1/reports').flush({ data: [{
      id: 5, spaceId: 2, spaceName: 'Aula A', category: 'technical',
      description: 'Lampada guasta', createdAt: '2026-10-10T10:00:00Z',
      photo: 'private', status: 'in_progress',
    }] });
    expect(result).toMatchObject([{
      id: '5', spaceId: '2', category: 'equipment',
      status: 'in-progress', dateLabel: '10/10/2026',
    }]);
  });

  it('invia FormData e normalizza categoria e descrizione senza cambiare il file', () => {
    const photo = new File(['foto'], 'foto.png', { type: 'image/png' });
    api.create('2', { category: 'equipment', description: ' Lampada guasta ', photo })
      .subscribe();
    const request = http.expectOne({ method: 'POST', url: '/api/v1/spaces/2/reports' });
    const body = request.request.body as FormData;
    expect(body.get('category')).toBe('technical');
    expect(body.get('description')).toBe('Lampada guasta');
    expect((body.get('photo') as File).name).toBe('foto.png');
    request.flush({ data: { id: 5 } });
  });

  it('carica la foto privata come blob e propaga gli errori', () => {
    let status = 0;
    api.photo('5').subscribe({ error: (error) => (status = error.status) });
    const request = http.expectOne({ method: 'GET', url: '/api/v1/reports/5/photo' });
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(), { status: 403, statusText: 'Forbidden' });
    expect(status).toBe(403);
  });
});
