import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
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

  it('apre il selettore data cliccando il contenuto del riquadro', () => {
    const input = fixture.nativeElement.querySelector('.booking-date-input') as HTMLInputElement;
    const showPicker = vi.fn();
    Object.defineProperty(input, 'showPicker', { configurable: true, value: showPicker });

    fixture.nativeElement.querySelector('.booking-date-value').click();

    expect(showPicker).toHaveBeenCalledOnce();
  });

  afterEach(() => http.verify());

  it('mostra le fasce ricevute dal server', async () => {
    (component as any).loadAvailability('1');
    http.expectOne('/api/v1/spaces/1/availability?date=' + component.selectedDate).flush({ data: [
      { availabilityId: 4, startTime: '08:00', endTime: '20:00', availableSeats: 24, bookable: true },
    ] });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.time-slot')?.textContent).toContain('08:00-20:00');
  });
  it('al rientro sostituisce la fascia ritirata con quella nuova', async () => {
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.paramMap, 'get').mockReturnValue('1');
    component.ngOnInit();
    component.ionViewWillEnter();
    const space = { id: 1, name: 'Aula', building: { name: 'Edificio 6' }, capacity: 24, services: [] };
    http.expectOne('/api/v1/spaces/1').flush({ data: space });
    const url = '/api/v1/spaces/1/availability?date=' + component.selectedDate;
    http.expectOne(url).flush({ data: [{ availabilityId: 4, startTime: '08:00', endTime: '10:00', bookable: true }] });
    component.ionViewWillEnter();
    expect(component.selectedAvailabilityId).toBeNull();
    http.expectOne('/api/v1/spaces/1').flush({ data: space });
    http.expectOne(url).flush({ data: [{ availabilityId: 9, startTime: '14:00', endTime: '16:00', bookable: true }] });
    await fixture.whenStable();
    expect(component.selectedAvailabilityId).toBe(9);
    expect(fixture.nativeElement.querySelector('.time-slots').textContent).toContain('14:00-16:00');
    expect(fixture.nativeElement.querySelector('.time-slots').textContent).not.toContain('08:00-10:00');
  });

  it('annulla la richiesta precedente quando cambia la data e distingue errore da elenco vuoto', async () => {
    (component as any).loadAvailability('1');
    const old = http.expectOne('/api/v1/spaces/1/availability?date=' + component.selectedDate);
    component.selectedDate = '2026-09-15';
    (component as any).loadAvailability('1');
    expect(old.cancelled).toBe(true);
    http.expectOne('/api/v1/spaces/1/availability?date=2026-09-15').flush({ data: [] });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Nessuna fascia prenotabile');
    (component as any).loadAvailability('1');
    http.expectOne('/api/v1/spaces/1/availability?date=2026-09-15').flush({}, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Impossibile caricare le fasce');
    expect(fixture.nativeElement.textContent).not.toContain('Nessuna fascia prenotabile');
  });

  function prepareGroup() {
    component.space.id = '1';
    component.space.seats = 10;
    component.timeSlots = [{ id: 4, label: '10:00-12:00', availableSeats: 3 }];
    component.selectedAvailabilityId = 4;
  }

  it('aggiunge un input per ogni ospite, conserva gli altri e rispetta i posti liberi', () => {
    prepareGroup();
    component.increaseParticipants();
    component.participantEmails[0] = 'primo@example.com';
    component.increaseParticipants();
    component.increaseParticipants();
    fixture.detectChanges();
    expect(component.participants).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('input[type=email]').length).toBe(2);
    component.decreaseParticipants();
    expect(component.participantEmails).toEqual(['primo@example.com']);
    component.decreaseParticipants();
    component.decreaseParticipants();
    expect(component.participants).toBe(1);
  });

  it('blocca email vuote, non valide e duplicate prima di inviare la prenotazione', () => {
    prepareGroup();
    for (const emails of [[''], ['non-valida'], ['a@example.com,b@example.com'], [' A@example.com ', 'a@example.com']]) {
      component.participantEmails = emails;
      component.confirmBooking();
      expect(component.errorMessage).toContain('email');
      http.expectNone('/api/v1/bookings');
    }
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-invalid="true"]')).not.toBeNull();
  });

  it('normalizza le email e invia solo gli ospiti mantenendo la chiave di idempotenza', async () => {
    prepareGroup();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.participantEmails = [' Primo@example.com ', 'secondo@example.com'];
    component.confirmBooking();
    const request = http.expectOne('/api/v1/bookings');
    expect(request.request.body.participantEmails).toEqual(['primo@example.com', 'secondo@example.com']);
    expect(request.request.headers.has('Idempotency-Key')).toBe(true);
    request.flush({ data: { id: 1 } });
    await fixture.whenStable();
  });

  it('non elimina email quando si sceglie una fascia con meno posti ma blocca l’invio', () => {
    prepareGroup();
    component.participantEmails = ['primo@example.com', 'secondo@example.com'];
    component.timeSlots[0].availableSeats = 1;
    component.confirmBooking();
    expect(component.participantEmails.length).toBe(2);
    expect(component.errorMessage).toContain('posti disponibili');
    http.expectNone('/api/v1/bookings');
  });

});
