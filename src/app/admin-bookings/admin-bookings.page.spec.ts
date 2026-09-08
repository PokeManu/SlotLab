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
    http.expectOne('/api/v1/admin/bookings?page=1&size=100').flush({ data: [], pagination: { page: 1, totalPages: 0 } });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  afterEach(() => http.verify());

  it('carica tutte le pagine e mostra subito organizzatore e dettaglio reali', async () => {
    component.loadBookings();
    const row = { id: 81, date: '2026-09-14', startTime: '10:00', endTime: '12:00', spaceName: 'Aula reale',
      organizerName: 'Utente Test', participantCount: 2, status: 'confirmed', building: 'Edificio 6', floor: 1 };
    http.expectOne('/api/v1/admin/bookings?page=1&size=100').flush({ data: [row], pagination: { page: 1, totalPages: 2 } });
    http.expectOne('/api/v1/admin/bookings?page=2&size=100').flush({ data: [{ ...row, id: 82, status: 'completed' }], pagination: { page: 2, totalPages: 2 } });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Utente Test');
    expect(fixture.nativeElement.textContent).not.toContain('Mario Rossi');
    expect(fixture.nativeElement.querySelector('app-booking-detail').textContent).toContain('Codice: 81');
    expect(component.bookings[1].status).toBe('Completata');
    expect(component.availableDates).toEqual(['2026-09-14']);
    component.selectedDate = '2026-09-15'; component.applyFilters();
    expect(component.selectedBooking).toBeNull();
  });

  it('ricarica al rientro e rimuove il dettaglio se non ci sono prenotazioni', async () => {
    component.ionViewWillEnter();
    http.expectNone('/api/v1/admin/bookings?page=1&size=100');
    component.ionViewWillEnter();
    http.expectOne('/api/v1/admin/bookings?page=1&size=100').flush({ data: [], pagination: { page: 1, totalPages: 0 } });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-booking-detail')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Nessuna prenotazione');
  });

  it('mostra un errore senza ripiegare su prenotazioni dimostrative', async () => {
    component.loadBookings();
    http.expectOne('/api/v1/admin/bookings?page=1&size=100').flush({}, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Impossibile caricare');
    expect(component.bookings).toEqual([]);
    expect(component.selectedBooking).toBeNull();
  });

});
