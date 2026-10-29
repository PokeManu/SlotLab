import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { BookingsPage } from './bookings.page';
import { romeDate } from '../models/rome-date';

function monthWithOffset(offset: number): string {
  const [year, month] = romeDate()
    .slice(0, 7)
    .split('-')
    .map(Number);
  return romeDate(new Date(Date.UTC(year, month - 1 + offset, 1, 12))).slice(
    0,
    7,
  );
}

describe('BookingsPage', () => {
  let component: BookingsPage;
  let fixture: ComponentFixture<BookingsPage>;
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingsPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
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
  it('changes the view through the Ionic segment', () => {
    const segment: HTMLIonSegmentElement =
      fixture.nativeElement.querySelector('ion-segment');
    segment.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'past' } }));
    fixture.detectChanges();

    expect(component.selectedView).toBe('past');
    expect(fixture.nativeElement.textContent).toContain('Nessuna prenotazione passata');
  });
  it('mostra la prenotazione appena ricevuta', async () => {
    const currentMonth = component.selectedMonth;
    component.ngOnInit();
    http
      .expectOne('/api/v1/bookings')
      .flush({
        data: [
          {
            id: 7,
            spaceId: 1,
            spaceName: 'Aula test',
            building: 'Edificio 6',
            floor: 2,
            date: `${currentMonth}-08`,
            startTime: '08:00',
            endTime: '20:00',
            status: 'confirmed',
            participantCount: 1,
          },
        ],
      });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aula test');
  });
  it('rimuove la prenotazione dopo una cancellazione riuscita', () => {
    const booking = {
      id: '7',
      spaceId: '1',
      spaceName: 'Aula test',
      status: 'confirmed' as const,
      dateLabel: '08/09/2026',
      startTime: '08:00',
      endTime: '20:00',
      building: 'Edificio 6',
      floor: 2,
      participants: 1,
      spaceType: 'study-room' as const,
    };
    component.upcomingBookingGroups = [
      { dateLabel: booking.dateLabel, bookings: [booking] },
    ];
    component.cancelBooking('7');
    const request = http.expectOne({
      method: 'DELETE',
      url: '/api/v1/bookings/7',
    });
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(component.upcomingBookingGroups).toHaveLength(0);
  });
  it('filtra le prenotazioni selezionando un mese', () => {
    const currentMonth = component.selectedMonth;
    const previousMonth = monthWithOffset(-1);
    component.ngOnInit();
    http.expectOne('/api/v1/bookings').flush({
      data: [
        {
          id: 7,
          spaceId: 1,
          spaceName: 'Aula mese precedente',
          building: 'Edificio 6',
          floor: 2,
          date: `${previousMonth}-08`,
          startTime: '08:00',
          endTime: '10:00',
          status: 'confirmed',
          participantCount: 1,
        },
        {
          id: 8,
          spaceId: 1,
          spaceName: 'Aula mese corrente',
          building: 'Edificio 6',
          floor: 2,
          date: `${currentMonth}-08`,
          startTime: '08:00',
          endTime: '10:00',
          status: 'confirmed',
          participantCount: 1,
        },
      ],
    });
    component.selectMonth({ target: { value: currentMonth } } as unknown as Event);
    expect(
      component.upcomingBookingGroups
        .flatMap((group) => group.bookings)
        .map((booking) => booking.spaceName),
    ).toEqual(['Aula mese corrente']);
  });
  it('ricarica le prenotazioni quando si rientra nella pagina', () => {
    const currentMonth = component.selectedMonth;
    component.ionViewDidEnter();
    component.ionViewDidEnter();
    http.expectOne('/api/v1/bookings').flush({
      data: [
        {
          id: 9,
          spaceId: 1,
          spaceName: 'Nuova aula',
          building: 'Edificio 6',
          floor: 2,
          date: `${currentMonth}-09`,
          startTime: '08:00',
          endTime: '10:00',
          status: 'confirmed',
          participantCount: 1,
        },
      ],
    });
    expect(
      component.upcomingBookingGroups
        .flatMap((group) => group.bookings)
        .map((booking) => booking.spaceName),
    ).toEqual(['Nuova aula']);
  });
  it('scarta una richiesta precedente e non ripropone dati vecchi dopo errore', () => {
    component.ionViewDidEnter();
    component.ionViewDidEnter();
    const oldRequest = http.expectOne('/api/v1/bookings');
    component.ionViewDidEnter();
    expect(oldRequest.cancelled).toBe(true);
    http.expectOne('/api/v1/bookings')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    component.selectMonth({ target: { value: component.selectedMonth } } as unknown as Event);
    expect(component.upcomingBookingGroups).toEqual([]);
  });
});
