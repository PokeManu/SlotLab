import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { BookingsPage } from './bookings.page';

describe('BookingsPage', () => {
  let component: BookingsPage;
  let fixture: ComponentFixture<BookingsPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingsPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/bookings').flush({ data: [] });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should change the selected booking view', () => {
    component.selectView('past');

    expect(component.selectedView).toBe('past');
  });

  it('mostra la prenotazione appena ricevuta', async () => {
    component.ngOnInit();
    http.expectOne('/api/v1/bookings').flush({ data: [{ id: 7, spaceId: 1, spaceName: 'Aula test', building: 'Edificio 6', floor: 2, date: '2026-09-08', startTime: '08:00', endTime: '20:00', status: 'confirmed', participantCount: 1 }] });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aula test');
  });

  it('rimuove la prenotazione dopo una cancellazione riuscita', () => {
    const booking = {
      id: '7', spaceId: '1', spaceName: 'Aula test', status: 'confirmed' as const,
      dateLabel: '08/09/2026', startTime: '08:00', endTime: '20:00', building: 'Edificio 6',
      floor: 2, participants: 1, spaceType: 'study-room' as const, canCheckIn: false,
    };
    component.upcomingBookingGroups = [{ dateLabel: booking.dateLabel, bookings: [booking] }];
    component.cancelBooking('7');
    const request = http.expectOne({ method: 'DELETE', url: '/api/v1/bookings/7' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(component.upcomingBookingGroups).toHaveLength(0);
  });

  it('filtra le prenotazioni selezionando un mese', () => {
    component.ngOnInit();
    http.expectOne('/api/v1/bookings').flush({ data: [
      { id: 7, spaceId: 1, spaceName: 'Aula settembre', building: 'Edificio 6', floor: 2, date: '2026-09-08', startTime: '08:00', endTime: '10:00', status: 'confirmed', participantCount: 1 },
      { id: 8, spaceId: 1, spaceName: 'Aula ottobre', building: 'Edificio 6', floor: 2, date: '2026-10-08', startTime: '08:00', endTime: '10:00', status: 'confirmed', participantCount: 1 },
    ] });
    component.selectMonth({ target: { value: '2026-10' } } as unknown as Event);
    expect(component.upcomingBookingGroups.flatMap(group => group.bookings).map(booking => booking.spaceName)).toEqual(['Aula ottobre']);
  });

  it('ricarica le prenotazioni quando si rientra nella pagina', () => {
    component.ionViewDidEnter();
    component.ionViewDidEnter();
    http.expectOne('/api/v1/bookings').flush({ data: [{
      id: 9, spaceId: 1, spaceName: 'Nuova aula', building: 'Edificio 6', floor: 2,
      date: '2026-09-09', startTime: '08:00', endTime: '10:00', status: 'confirmed', participantCount: 1,
    }] });
    expect(component.upcomingBookingGroups.flatMap(group => group.bookings).map(booking => booking.spaceName)).toEqual(['Nuova aula']);
  });
});
