import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AdminAnnouncementsPage } from './admin-announcements.page';
describe('AdminAnnouncementsPage', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('invia una sola volta e mostra subito il numero di destinatari', async () => {
    const fixture = TestBed.createComponent(AdminAnnouncementsPage);
    const page = fixture.componentInstance;
    fixture.detectChanges();
    page.title = ' Titolo ';
    page.message = ' Messaggio ';
    page.publish();
    page.publish();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('ion-button[type="submit"]').disabled,
    ).toBe(true);
    const request = TestBed.inject(HttpTestingController).expectOne({
      method: 'POST',
      url: '/api/v1/admin/announcements',
    });
    expect(request.request.body).toEqual({
      title: 'Titolo',
      message: 'Messaggio',
    });
    request.flush({ data: { recipientCount: 3 } });
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('[role="status"]').textContent,
    ).toContain('Destinatari: 3');
    expect(page.title).toBe('');
    expect(page.message).toBe('');
    expect(fixture.nativeElement.querySelector('#announcement-title-error')).toBeNull();
    expect(fixture.nativeElement.querySelector('#announcement-message-error')).toBeNull();
  });
  it('mostra errori sui controlli Ionic dopo invio invalido e non pubblica', async () => {
    const fixture = TestBed.createComponent(AdminAnnouncementsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.publish();
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('ion-input[name=title]');
    const message = fixture.nativeElement.querySelector('ion-textarea[name=message]');
    expect(title.getAttribute('aria-invalid')).toBe('true');
    expect(message.getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('[role="alert"]')).toHaveLength(2);
    expect(fixture.componentInstance.error()).toBe('');
    TestBed.inject(HttpTestingController).expectNone('/api/v1/admin/announcements');
  });
  it('rifiuta anche soli spazi e conserva il testo dopo un errore server', async () => {
    const fixture = TestBed.createComponent(AdminAnnouncementsPage);
    const page = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    page.title = '   ';
    page.message = '   ';
    page.publish();
    await fixture.whenStable();
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectNone(
      '/api/v1/admin/announcements',
    );
    expect(page.error()).toBe('');
    expect(fixture.nativeElement.querySelector('#announcement-title-error')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#announcement-message-error')).not.toBeNull();
    page.title = 'Titolo';
    page.message = 'Messaggio';
    page.publish();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/admin/announcements')
      .flush({}, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('[role="alert"]').textContent,
    ).toContain('Pubblicazione non confermata');
    expect(page.message).toBe('Messaggio');
    expect(page.sending()).toBe(false);
  });
});
