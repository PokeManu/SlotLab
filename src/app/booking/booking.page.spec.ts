import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
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

});
