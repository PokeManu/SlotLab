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
    http.expectOne('/api/v1/admin/bookings?size=5').flush({ data: [{ date: new Date().toISOString().slice(0, 10), startTime: '10:00', spaceName: 'Aula test', building: 'Edificio 6', participantCount: 2, status: 'confirmed' }] });
    http.expectOne('/api/v1/admin/spaces').flush({ data: [{ name: 'Aula test', type: 'study_room', status: 'active' }] });
    http.expectOne('/api/v1/admin/reports').flush({ data: [{ status: 'open' }, { status: 'in_progress' }, { status: 'resolved' }] });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.booking-row strong')?.textContent).toContain('Aula test');
    expect(fixture.nativeElement.querySelector('.space-status__description')?.textContent).toContain('Aula test');
    const counts = Array.from(fixture.nativeElement.querySelectorAll('.metric-card__value'), (node) => (node as HTMLElement).textContent?.trim());
    expect(counts).toEqual(['7', '3', '2']);
    http.verify();
  });
});
