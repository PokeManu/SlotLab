import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { allPages } from './all-pages';
it('carica le pagine successive mantenendo i filtri della prima richiesta', () => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const http = TestBed.inject(HttpTestingController);
  let ids: number[] = [];
  allPages<{ id: number }>(TestBed.inject(HttpClient), '/api/v1/spaces?accessible=true').subscribe(result => ids = result.data.map(row => row.id));
  http.expectOne('/api/v1/spaces?accessible=true').flush({ data: [{ id: 1 }], pagination: { page: 1, totalPages: 2 } });
  http.expectOne('/api/v1/spaces?accessible=true&page=2').flush({ data: [{ id: 2 }], pagination: { page: 2, totalPages: 2 } });
  expect(ids).toEqual([1, 2]); http.verify();
});
