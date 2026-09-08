import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminDashboardPage } from './admin-dashboard.page';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('AdminDashboardPage', () => {
  let component: AdminDashboardPage;
  let fixture: ComponentFixture<AdminDashboardPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    fixture = TestBed.createComponent(AdminDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('mostra le risposte asincrone senza navigazione o clic', async () => {
    const http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    http.expectOne('/api/v1/admin/summary').flush({ data: { bookingCount: 7, spaceCount: 4, availableSpaceCount: 3, openReportCount: 2 } });
    http.expectOne('/api/v1/admin/bookings?size=5').flush({ data: [
      { date: '2099-12-31', startTime: '10:00', spaceName: 'Aula test', building: 'Edificio 6', participantCount: 2, status: 'confirmed' },
      { date: '2000-01-01', startTime: '10:00', spaceName: 'Aula conclusa', building: 'Edificio 6', participantCount: 2, status: 'completed' },
    ] });
    http.expectOne('/api/v1/admin/spaces').flush({ data: [{ name: 'Aula test', type: 'study_room', status: 'active' }] });
    http.expectOne('/api/v1/admin/reports').flush({ data: [{ status: 'open' }, { status: 'in_progress' }, { status: 'resolved' }] });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.booking-row strong')?.textContent).toContain('Aula test');
    expect(component.bookings.length).toBe(1);
    expect(fixture.nativeElement.querySelector('.space-status__description')?.textContent).toContain('Aula test');
    const counts = Array.from(fixture.nativeElement.querySelectorAll('.metric-card__value'), (node) => (node as HTMLElement).textContent?.trim());
    expect(counts).toEqual(['7', '3', '2']);
    http.verify();
  });

  it('ricarica il riepilogo al rientro per riflettere una segnalazione appena risolta', async () => {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/summary').flush({ data: { bookingCount: 1, spaceCount: 4, availableSpaceCount: 3, openReportCount: 1 } });
    http.expectOne('/api/v1/admin/bookings?size=5').flush({ data: [], pagination: { page: 1, totalPages: 1 } });
    http.expectOne('/api/v1/admin/spaces').flush({ data: [] });
    http.expectOne('/api/v1/admin/reports').flush({ data: [] });

    component.ionViewWillEnter();
    http.expectNone('/api/v1/admin/summary');
    component.ionViewWillEnter();
    http.expectOne('/api/v1/admin/summary').flush({ data: { bookingCount: 1, spaceCount: 4, availableSpaceCount: 3, openReportCount: 0 } });
    await fixture.whenStable();

    expect(component.openReportCount).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.metric-card__value')[2].textContent.trim()).toBe('0');
    http.verify();
  });
});
