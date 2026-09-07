import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminBookingsPage } from './admin-bookings.page';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

describe('AdminBookingsPage', () => {
  let component: AdminBookingsPage;
  let fixture: ComponentFixture<AdminBookingsPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    fixture = TestBed.createComponent(AdminBookingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/bookings').flush({ data: [] });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
