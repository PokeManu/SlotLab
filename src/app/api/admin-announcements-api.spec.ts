import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AdminAnnouncementsApi } from './admin-announcements-api';

describe('AdminAnnouncementsApi', () => {
  let api: AdminAnnouncementsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdminAnnouncementsApi,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(AdminAnnouncementsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pubblica titolo e messaggio sull endpoint amministrativo', () => {
    let response: { data: { recipientCount: number } } | undefined;
    api.publish('Titolo', 'Messaggio').subscribe((value) => (response = value));

    const request = http.expectOne({
      method: 'POST',
      url: '/api/v1/admin/announcements',
    });
    expect(request.request.body).toEqual({
      title: 'Titolo',
      message: 'Messaggio',
    });
    request.flush({ data: { recipientCount: 4 } });

    expect(response).toEqual({ data: { recipientCount: 4 } });
  });
});
