import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingListItemComponent } from './booking-list-item.component';
describe('BookingListItemComponent', () => {
  let component: BookingListItemComponent;
  let fixture: ComponentFixture<BookingListItemComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingListItemComponent],
      providers: [provideRouter([])],
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
    });
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Check-in');
    expect(
      fixture.nativeElement.querySelector('a[href^="/check-in"]'),
    ).toBeNull();
  });

  it('emits cancellation only from the dedicated Ionic button', () => {
    const cancelled: string[] = [];
    component.cancelBookingRequested.subscribe((id) => cancelled.push(id));

    const card: HTMLElement = fixture.nativeElement.querySelector('ion-card');
    const detail: HTMLElement = fixture.nativeElement.querySelector(
      '.booking-item__check-in',
    );
    const cancel: HTMLElement = fixture.nativeElement.querySelector(
      '.booking-item__cancel',
    );

    expect(card).toBeTruthy();
    expect(fixture.nativeElement.querySelector('ion-badge')?.textContent).toContain('Confermata');
    expect(detail).toBeTruthy();
    cancel.click();
    expect(cancelled).toEqual(['booking-test']);
  });
});
