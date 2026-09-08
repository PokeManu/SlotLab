import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ReportDetailComponent } from './report-detail.component';
import type { AdminReport } from '../admin-reports/admin-reports.page';

describe('Foto nel dettaglio della segnalazione', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('mostra la foto ricevuta e la rimuove cambiando segnalazione', async () => {
    const revoke = vi.fn();
    vi.stubGlobal('URL', class extends URL {
      static override createObjectURL = vi.fn(() => 'blob:report-photo');
      static override revokeObjectURL = revoke;
    });
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(ReportDetailComponent);
    const http = TestBed.inject(HttpTestingController);
    const report: AdminReport = { id: 7, title: 'Foto', space: 'Aula', date: '', reporter: '', description: '', priority: 'low', priorityLabel: 'Bassa', status: 'open', statusLabel: 'Aperta', assignee: '—', icon: '', photoPath: 'photo.png' };
    fixture.componentRef.setInput('selectedReport', report);
    fixture.detectChanges();
    http.expectOne('/api/v1/admin/reports/7/photo').flush(new Blob(['photo'], { type: 'image/png' }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.report-photo')?.getAttribute('src')).toBe('blob:report-photo');
    fixture.componentRef.setInput('selectedReport', { ...report, id: 8, photoPath: null });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.report-photo')).toBeNull();
    expect(revoke).toHaveBeenCalledWith('blob:report-photo');
    http.verify();
    fixture.destroy();
  });
});
