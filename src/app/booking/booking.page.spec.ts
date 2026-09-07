import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { BookingPage } from './booking.page';

describe('BookingPage', () => {
  let component: BookingPage;
  let fixture: ComponentFixture<BookingPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    fixture = TestBed.createComponent(BookingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('mostra le fasce ricevute dal server', async () => {
    (component as any).loadAvailability('1');
    http.expectOne('/api/v1/spaces/1/availability?date=' + component.selectedDate).flush({ data: [
      { availabilityId: 4, startTime: '08:00', endTime: '20:00', availableSeats: 24, bookable: true },
    ] });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.time-slot')?.textContent).toContain('08:00-20:00');
  });
});
