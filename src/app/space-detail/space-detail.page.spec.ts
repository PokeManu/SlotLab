import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { SpaceDetailPage } from './space-detail.page';

describe('SpaceDetailPage', () => {
  let component: SpaceDetailPage;
  let fixture: ComponentFixture<SpaceDetailPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    fixture = TestBed.createComponent(SpaceDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http.match(request => request.urlWithParams.startsWith('/api/v1/spaces/')).forEach(testRequest => testRequest.flush({ data: testRequest.request.urlWithParams.includes('/availability') ? [] : {
      id: 1, name: 'Test', building: { name: 'Edificio' }, floor: 1, type: 'study_room', capacity: 10, accessible: true, status: 'active', services: [],
    } }));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
