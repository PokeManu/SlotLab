import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingListItemComponent } from './booking-list-item.component';

describe('BookingListItemComponent', () => {
  let component: BookingListItemComponent;
  let fixture: ComponentFixture<BookingListItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingListItemComponent], providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingListItemComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('booking', {
      id: 'booking-test',
      spaceName: 'Aula Studio A3',
      spaceType: 'study-room',
      status: 'confirmed',
      dateLabel: 'Oggi',
      startTime: '10:00',
      endTime: '12:00',
      building: 'Edificio 6',
      floor: 2,
      participants: 4,
      canCheckIn: true,
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
