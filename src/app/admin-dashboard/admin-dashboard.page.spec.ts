import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminDashboardPage } from './admin-dashboard.page';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
describe('AdminDashboardPage', () => {
  let component: AdminDashboardPage;
  let fixture: ComponentFixture<AdminDashboardPage>;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(AdminDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-admin-sidebar')).toBeNull();
    expect(fixture.nativeElement.querySelector('.dashboard')).toBeTruthy();
  });
  it('mostra le risposte asincrone senza navigazione o clic', async () => {
    const http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    http.expectOne('/api/v1/admin/summary').flush({
      data: {
        bookingCount: 7,
        spaceCount: 4,
        availableSpaceCount: 3,
        openReportCount: 2,
      },
    });
    http.expectOne('/api/v1/admin/bookings?size=5').flush({
      data: [
        {
          date: '2099-12-31',
          startTime: '10:00',
          spaceName: 'Aula test',
          building: 'Edificio 6',
          participantCount: 2,
          status: 'confirmed',
        },
        {
          date: '2000-01-01',
          startTime: '10:00',
          spaceName: 'Aula conclusa',
          building: 'Edificio 6',
          participantCount: 2,
          status: 'completed',
        },
      ],
    });
    http.expectOne('/api/v1/admin/spaces').flush({
      data: [{ name: 'Aula test', type: 'study_room', status: 'active' }],
    });
    http.expectOne('/api/v1/admin/reports').flush({
      data: [
        { status: 'open' },
        { status: 'in_progress' },
        { status: 'resolved' },
      ],
    });
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('.booking-row strong')?.textContent,
    ).toContain('Aula test');
    expect(component.bookings.length).toBe(1);
    expect(
      fixture.nativeElement.querySelector('.space-status__description')
        ?.textContent,
    ).toContain('Aula test');
    const counts = Array.from(
      fixture.nativeElement.querySelectorAll('.metric-card__value'),
      (node) => (node as HTMLElement).textContent?.trim(),
    );
    expect(counts).toEqual(['7', '3', '2']);
    http.verify();
  });
  it('collega la ricerca e le azioni ai controlli Ionic', () => {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/summary').flush({
      data: {
        bookingCount: 0,
        spaceCount: 0,
        availableSpaceCount: 0,
        openReportCount: 0,
      },
    });
    http.expectOne('/api/v1/admin/bookings?size=5').flush({ data: [] });
    http.expectOne('/api/v1/admin/spaces').flush({ data: [] });
    http.expectOne('/api/v1/admin/reports').flush({ data: [] });

    const searchbar = fixture.nativeElement.querySelector('ion-searchbar');
    searchbar.dispatchEvent(
      new CustomEvent('ionInput', { detail: { value: 'Aula A1' } }),
    );
    fixture.detectChanges();
    expect(component.searchTerm).toBe('Aula A1');

    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate');
    component.searchAdmin();
    component.openBookings();
    component.openSpaces();
    expect(navigate).toHaveBeenNthCalledWith(1, ['/admin/spaces'], {
      queryParams: { search: 'Aula A1' },
    });
    expect(navigate).toHaveBeenNthCalledWith(2, ['/admin/bookings']);
    expect(navigate).toHaveBeenNthCalledWith(3, ['/admin/spaces']);
    expect(fixture.nativeElement.querySelectorAll('ion-button').length).toBe(2);
    http.verify();
  });
  it('ricarica il riepilogo al rientro per riflettere una segnalazione appena risolta', async () => {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/summary').flush({
      data: {
        bookingCount: 1,
        spaceCount: 4,
        availableSpaceCount: 3,
        openReportCount: 1,
      },
    });
    http
      .expectOne('/api/v1/admin/bookings?size=5')
      .flush({ data: [], pagination: { page: 1, totalPages: 1 } });
    http.expectOne('/api/v1/admin/spaces').flush({ data: [] });
    http.expectOne('/api/v1/admin/reports').flush({ data: [] });
    component.ionViewWillEnter();
    http.expectNone('/api/v1/admin/summary');
    component.ionViewWillEnter();
    http.expectOne('/api/v1/admin/summary').flush({
      data: {
        bookingCount: 1,
        spaceCount: 4,
        availableSpaceCount: 3,
        openReportCount: 0,
      },
    });
    http.expectOne('/api/v1/admin/bookings?size=5').flush({ data: [] });
    http.expectOne('/api/v1/admin/spaces').flush({
      data: [{ name: 'Aula aggiornata', type: 'study_room', status: 'maintenance' }],
    });
    http.expectOne('/api/v1/admin/reports').flush({ data: [] });
    await fixture.whenStable();
    expect(component.openReportCount).toBe(0);
    expect(component.spaceStatuses[0].name).toBe('Aula aggiornata');
    expect(
      fixture.nativeElement
        .querySelectorAll('.metric-card__value')[2]
        .textContent.trim(),
    ).toBe('0');
    http.verify();
  });
  it('annulla le risposte precedenti al rientro e mostra i nuovi stati', () => {
    const http = TestBed.inject(HttpTestingController);
    const oldSummary = http.expectOne('/api/v1/admin/summary');
    const oldBookings = http.expectOne('/api/v1/admin/bookings?size=5');
    const oldSpaces = http.expectOne('/api/v1/admin/spaces');
    const oldReports = http.expectOne('/api/v1/admin/reports');

    component.ionViewWillEnter();
    component.ionViewWillEnter();
    expect(oldSummary.cancelled).toBe(true);
    expect(oldBookings.cancelled).toBe(true);
    expect(oldSpaces.cancelled).toBe(true);
    expect(oldReports.cancelled).toBe(true);

    http.expectOne('/api/v1/admin/summary').flush({
      data: {
        bookingCount: 2,
        spaceCount: 1,
        availableSpaceCount: 0,
        openReportCount: 0,
      },
    });
    http.expectOne('/api/v1/admin/bookings?size=5').flush({ data: [] });
    http.expectOne('/api/v1/admin/spaces').flush({
      data: [{ name: 'Aula in manutenzione', type: 'study_room', status: 'maintenance' }],
    });
    http.expectOne('/api/v1/admin/reports').flush({ data: [] });

    expect(component.bookingCount).toBe(2);
    expect(component.spaceStatuses[0].details).toBe('Manutenzione');
    http.verify();
  });
  it('distingue caricamento, errore e retry dei tre riquadri', () => {
    const http = TestBed.inject(HttpTestingController);
    expect(fixture.nativeElement.querySelectorAll('ion-spinner').length).toBe(3);
    http
      .expectOne('/api/v1/admin/summary')
      .flush({}, { status: 503, statusText: 'Offline' });
    http
      .expectOne('/api/v1/admin/bookings?size=5')
      .flush({}, { status: 503, statusText: 'Offline' });
    http
      .expectOne('/api/v1/admin/spaces')
      .flush({}, { status: 503, statusText: 'Offline' });
    http.expectOne('/api/v1/admin/reports').flush({ data: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[role="alert"]').length).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('Impossibile caricare il riepilogo');
    expect(fixture.nativeElement.textContent).toContain('Impossibile caricare le prenotazioni');
    expect(fixture.nativeElement.textContent).toContain('Impossibile caricare lo stato degli spazi');

    component.retrySummary();
    component.retryBookings();
    component.retrySpaces();
    http.expectOne('/api/v1/admin/summary').flush({
      data: {
        bookingCount: 1,
        spaceCount: 1,
        availableSpaceCount: 1,
        openReportCount: 0,
      },
    });
    http.expectOne('/api/v1/admin/bookings?size=5').flush({ data: [] });
    http.expectOne('/api/v1/admin/spaces').flush({ data: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[role="alert"]').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Nessuna prenotazione in programma');
    expect(fixture.nativeElement.textContent).toContain('Nessuno spazio da mostrare');
    http.verify();
  });
});
