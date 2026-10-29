import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminBookingsPage } from './admin-bookings.page';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
describe('AdminBookingsPage', () => {
  let component: AdminBookingsPage;
  let fixture: ComponentFixture<AdminBookingsPage>;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(AdminBookingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/v1/admin/bookings?page=1&size=100')
      .flush({ data: [], pagination: { page: 1, totalPages: 0 } });
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  afterEach(() => http.verify());
  it('carica tutte le pagine e mostra subito organizzatore e dettaglio reali', async () => {
    component.loadBookings();
    const row = {
      id: 81,
      date: '2026-09-14',
      startTime: '10:00',
      endTime: '12:00',
      spaceName: 'Aula reale',
      organizerName: 'Utente Test',
      participantCount: 2,
      status: 'confirmed',
      building: 'Edificio 6',
      floor: 1,
      participants: [
        {
          firstName: 'Utente',
          lastName: 'Test',
          email: 'presente@test.example',
          present: true,
          checkedInAt: '2026-09-10T08:52:03Z',
        },
        {
          firstName: 'Altra',
          lastName: 'Persona',
          email: 'assente@test.example',
          present: false,
          checkedInAt: null,
        },
      ],
    };
    http
      .expectOne('/api/v1/admin/bookings?page=1&size=100')
      .flush({ data: [row], pagination: { page: 1, totalPages: 2 } });
    http
      .expectOne('/api/v1/admin/bookings?page=2&size=100')
      .flush({
        data: [{ ...row, id: 82, status: 'completed' }],
        pagination: { page: 2, totalPages: 2 },
      });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Utente Test');
    expect(fixture.nativeElement.textContent).not.toContain('Mario Rossi');
    expect(
      fixture.nativeElement.querySelector('app-booking-detail').textContent,
    ).toContain('Codice: 81');
    const rows = fixture.nativeElement.querySelectorAll(
      '.booking-table tbody tr',
    );
    rows[1].click();
    fixture.detectChanges();
    expect(component.selectedBooking?.code).toBe('82');
    expect(
      fixture.nativeElement.querySelector('app-booking-detail').textContent,
    ).toContain('Codice: 82');
    rows[0].click();
    fixture.detectChanges();
    expect(component.selectedBooking?.code).toBe('81');
    expect(
      fixture.nativeElement.querySelector('app-booking-detail').textContent,
    ).toContain('Dettaglio prenotazione');
    expect(
      fixture.nativeElement.querySelector('app-booking-detail').textContent,
    ).toContain('Check-in registrato:');
    expect(
      fixture.nativeElement.querySelector('app-booking-detail').textContent,
    ).toContain('10:52:03');
    expect(
      fixture.nativeElement.querySelector('app-booking-detail').textContent,
    ).toContain('Check-in non registrato');
    expect(component.bookings[1].status).toBe('Completata');
    expect(component.availableDates).toEqual(['2026-09-14']);
    component.selectedDate = '2026-09-15';
    component.applyFilters();
    expect(component.selectedBooking).toBeNull();
  });
  it('ricarica al rientro e rimuove il dettaglio se non ci sono prenotazioni', async () => {
    component.ionViewWillEnter();
    http.expectNone('/api/v1/admin/bookings?page=1&size=100');
    component.ionViewWillEnter();
    http
      .expectOne('/api/v1/admin/bookings?page=1&size=100')
      .flush({ data: [], pagination: { page: 1, totalPages: 0 } });
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('app-booking-detail'),
    ).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Nessuna prenotazione');
  });
  it('mostra un errore senza ripiegare su prenotazioni dimostrative', async () => {
    component.loadBookings();
    http
      .expectOne('/api/v1/admin/bookings?page=1&size=100')
      .flush({}, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('[role="alert"]').textContent,
    ).toContain('Impossibile caricare');
    expect(component.bookings).toEqual([]);
    expect(component.selectedBooking).toBeNull();
  });
  it('usa controlli Ionic per stato, retry e paginazione senza perdere la selezione', async () => {
    component.loadBookings();
    http.expectOne('/api/v1/admin/bookings?page=1&size=100').flush(
      {},
      { status: 500, statusText: 'Error' },
    );
    await fixture.whenStable();
    const retry = fixture.nativeElement.querySelector('.booking-table__empty ion-button');
    expect(retry?.textContent).toContain('Riprova');
    retry.click();
    const rows = Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      date: '2026-10-10',
      startTime: '10:00',
      endTime: '12:00',
      spaceName: `Aula ${index + 1}`,
      organizerName: 'Utente Test',
      participantCount: 1,
      status: 'confirmed',
      building: 'Edificio 1',
      floor: 0,
    }));
    http.expectOne('/api/v1/admin/bookings?page=1&size=100').flush({
      data: rows,
      pagination: { page: 1, totalPages: 1 },
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('ion-badge.booking-status').length).toBe(4);
    const pageTwo = fixture.nativeElement.querySelectorAll('.pagination__button')[2];
    pageTwo.click();
    fixture.detectChanges();
    expect(component.currentPage).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Aula 5');
    expect(fixture.nativeElement.querySelector('.pagination__button--active')?.textContent).toContain('2');
  });
});
