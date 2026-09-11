import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingSummary } from '../models/booking-summary.model';
import { NextBookingComponent } from './next-booking.component';
describe('NextBookingComponent', () => {
  let component: NextBookingComponent;
  let fixture: ComponentFixture<NextBookingComponent>;
  const testBooking: BookingSummary = {
    id: 'booking-test',
    spaceName: 'Aula di prova',
    status: 'confirmed',
    dateLabel: 'Oggi',
    startTime: '10:00',
    endTime: '12:00',
    building: 'Edificio 6',
    floor: 2,
    participants: 1,
  };
  beforeEach(() => {
    fixture = TestBed.createComponent(NextBookingComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('booking', testBooking);
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
