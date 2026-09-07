import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminReportsPage } from './admin-reports.page';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

describe('AdminReportsPage', () => {
  let component: AdminReportsPage;
  let fixture: ComponentFixture<AdminReportsPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    fixture = TestBed.createComponent(AdminReportsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/reports').flush({ data: [] });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('salva lo stato con una sola richiesta PATCH', () => {
    const report = {
      id: 7, title: 'technical', space: 'Aula Studio A1', date: '07/09/2026', reporter: 'utente@example.com',
      description: 'Problema', priority: 'high' as const, priorityLabel: 'Alta', status: 'open' as const,
      statusLabel: 'Aperta', assignee: '—', icon: 'warning-outline',
    };
    component.reports.push(report);
    component.selectedReport = report;
    component.updateStatus('resolved');
    const request = http.expectOne({ method: 'PATCH', url: '/api/v1/admin/reports/7/status' });
    expect(request.request.body).toEqual({ status: 'resolved' });
    request.flush({ data: { status: 'resolved' } });
    expect(report.status).toBe('resolved');
    expect(report.statusLabel).toBe('Risolta');
  });
});
