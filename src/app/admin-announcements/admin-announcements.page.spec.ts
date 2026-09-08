import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminAnnouncementsPage } from './admin-announcements.page';

describe('AdminAnnouncementsPage', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('invia una sola volta e mostra subito il numero di destinatari', async () => {
    const fixture = TestBed.createComponent(AdminAnnouncementsPage);
    const page = fixture.componentInstance;
    fixture.detectChanges();
    page.title = ' Titolo '; page.message = ' Messaggio ';
    page.publish(); page.publish();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    const request = TestBed.inject(HttpTestingController).expectOne({ method: 'POST', url: '/api/v1/admin/announcements' });
    expect(request.request.body).toEqual({ title: 'Titolo', message: 'Messaggio' });
    request.flush({ data: { recipientCount: 3 } });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Destinatari: 3');
    expect(page.title).toBe('');
    expect(page.message).toBe('');
  });

  it('rifiuta campi vuoti e conserva il testo dopo un errore', async () => {
    const fixture = TestBed.createComponent(AdminAnnouncementsPage);
    const page = fixture.componentInstance;
    fixture.detectChanges();
    page.publish();
    TestBed.inject(HttpTestingController).expectNone('/api/v1/admin/announcements');
    expect(page.error()).toContain('Inserisci');
    page.title = 'Titolo'; page.message = 'Messaggio';
    page.publish();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/admin/announcements').flush({}, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Pubblicazione non confermata');
    expect(page.message).toBe('Messaggio');
    expect(page.sending()).toBe(false);
  });
});
