import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ReportDetailComponent } from './report-detail.component';
import type { AdminReport } from '../api/admin-reports-api';
describe('Foto nel dettaglio della segnalazione', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('mostra la foto ricevuta e la rimuove cambiando segnalazione', async () => {
    const revoke = vi.fn();
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = vi.fn(() => 'blob:report-photo');
        static override revokeObjectURL = revoke;
      },
    );
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(ReportDetailComponent);
    const http = TestBed.inject(HttpTestingController);
    const report: AdminReport = {
      id: 7,
      title: 'Foto',
      space: 'Aula',
      date: '',
      reporter: '',
      description: '',
      priority: 'low',
      priorityLabel: 'Bassa',
      status: 'open',
      statusLabel: 'Aperta',
      assignee: '—',
      icon: '',
      photoPath: 'photo.png',
    };
    fixture.componentRef.setInput('selectedReport', report);
    fixture.detectChanges();
    http
      .expectOne('/api/v1/admin/reports/7/photo')
      .flush(new Blob(['photo'], { type: 'image/png' }));
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('.report-photo')?.getAttribute('src'),
    ).toBe('blob:report-photo');
    fixture.componentRef.setInput('savingStatus', true);
    fixture.detectChanges();
    http.expectNone('/api/v1/admin/reports/7/photo');
    expect(fixture.nativeElement.querySelector('.report-photo')).not.toBeNull();
    fixture.componentRef.setInput('selectedReport', {
      ...report,
      id: 8,
      photoPath: null,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.report-photo')).toBeNull();
    expect(revoke).toHaveBeenCalledWith('blob:report-photo');
    http.verify();
    fixture.destroy();
  });

  it('usa ion-select e ion-button senza rendere modificabile l’assegnatario', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(ReportDetailComponent);
    const component = fixture.componentInstance;
    const report: AdminReport = {
      id: 12,
      title: 'Attrezzatura',
      space: 'Aula',
      date: '10/09/2026',
      reporter: 'utente@example.com',
      description: 'Descrizione',
      priority: 'medium',
      priorityLabel: 'Media',
      status: 'open',
      statusLabel: 'Aperta',
      assignee: '—',
      icon: 'warning-outline',
    };
    fixture.componentRef.setInput('selectedReport', report);
    fixture.detectChanges();

    const statusSelect = fixture.nativeElement.querySelector('ion-select');
    expect(statusSelect).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('select')).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('—');

    const emitted: string[] = [];
    component.statusChange.subscribe((value) => emitted.push(value));
    statusSelect.dispatchEvent(
      new CustomEvent('ionChange', { detail: { value: 'resolved' } }),
    );
    fixture.detectChanges();
    fixture.nativeElement.querySelector('ion-button').click();
    expect(emitted).toEqual(['resolved']);

    component.savingStatus = true;
    component.saveStatus('in-progress');
    expect(emitted).toEqual(['resolved']);
  });
});
