import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminReportsPage } from './admin-reports.page';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
describe('AdminReportsPage', () => {
  let component: AdminReportsPage;
  let fixture: ComponentFixture<AdminReportsPage>;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
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
      id: 7,
      title: 'technical',
      space: 'Aula Studio A1',
      date: '07/09/2026',
      reporter: 'utente@example.com',
      description: 'Problema',
      priority: 'high' as const,
      priorityLabel: 'Alta',
      status: 'open' as const,
      statusLabel: 'Aperta',
      assignee: '—',
      icon: 'warning-outline',
    };
    component.reports.push(report);
    component.selectedReport = report;
    component.setFilter('open');
    component.updateStatus('resolved');
    const request = http.expectOne({
      method: 'PATCH',
      url: '/api/v1/admin/reports/7/status',
    });
    expect(request.request.body).toEqual({ status: 'resolved' });
    request.flush({ data: { status: 'resolved' } });
    expect(report.status).toBe('resolved');
    expect(report.statusLabel).toBe('Risolta');
    expect(component.statusMessage).toBe('Aggiornamento salvato.');
    expect(component.filteredReports).toEqual([]);
    expect(component.selectedReport).toBeUndefined();
  });
  it('mostra una nuova segnalazione al rientro senza ricaricare il browser', async () => {
    component.ionViewWillEnter();
    http.expectNone('/api/v1/admin/reports');
    component.ionViewWillEnter();
    http.expectOne('/api/v1/admin/reports').flush({
      data: [
        {
          id: 9,
          spaceName: 'Aula nuova',
          category: 'other',
          description: 'Segnalazione appena inviata',
          priority: 'low',
          status: 'open',
          authorEmail: 'utente@example.test',
          createdAt: '2026-09-08T08:00:00Z',
        },
      ],
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(
      'Segnalazione appena inviata',
    );
    expect(component.reports.map((report) => report.id)).toEqual([9]);
    http.verify();
  });
  it('mostra lo stato corrente nell’elenco delle segnalazioni', async () => {
    component.reports.push({
      id: 10,
      title: 'cleaning',
      space: 'Aula Studio A1',
      date: '09/09/2026',
      reporter: 'utente@example.com',
      description: 'Pulizia necessaria',
      priority: 'medium',
      priorityLabel: 'Media',
      status: 'in-progress',
      statusLabel: 'In lavorazione',
      assignee: '—',
      icon: 'warning-outline',
    });
    fixture.detectChanges();
    await fixture.whenStable();
    const status = fixture.nativeElement.querySelector('.status-pill');
    expect(status.textContent).toContain('Stato: In lavorazione');
    expect(status.getAttribute('data-status')).toBe('in-progress');
  });

  it('usa il segmento Ionic per filtrare le segnalazioni', () => {
    component.reports.push({
      id: 11,
      title: 'other',
      space: 'Laboratorio',
      date: '10/09/2026',
      reporter: 'utente@example.com',
      description: 'Altro problema',
      priority: 'low',
      priorityLabel: 'Bassa',
      status: 'resolved',
      statusLabel: 'Risolta',
      assignee: '—',
      icon: 'warning-outline',
    });
    fixture.detectChanges();
    const segment = fixture.nativeElement.querySelector('ion-segment');
    segment.dispatchEvent(
      new CustomEvent('ionChange', { detail: { value: 'resolved' } }),
    );
    fixture.detectChanges();
    expect(component.activeFilter).toBe('resolved');
    expect(component.filteredReports.map((report) => report.id)).toEqual([11]);
    expect(component.selectedReport?.id).toBe(11);
    component.setFilter('open');
    expect(component.selectedReport).toBeUndefined();
  });

  it('mostra errore e permette di riprovare il caricamento', async () => {
    component.loadReports();
    const request = http.expectOne('/api/v1/admin/reports');
    request.flush({ message: 'errore' }, { status: 503, statusText: 'Offline' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.loading).toBe(false);
    expect(fixture.nativeElement.textContent).toContain(
      'Non è stato possibile caricare le segnalazioni.',
    );
    const retry = fixture.nativeElement.querySelector('ion-button');
    retry.click();
    expect(component.loading).toBe(true);
    http.expectOne('/api/v1/admin/reports').flush({ data: [] });
    await fixture.whenStable();
  });
});
