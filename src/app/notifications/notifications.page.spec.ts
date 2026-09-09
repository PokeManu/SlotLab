import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationsPage } from './notifications.page';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

describe('NotificationsPage', () => {
  let component: NotificationsPage;
  let fixture: ComponentFixture<NotificationsPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NotificationsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne('/api/v1/notifications').flush({ data: [] });
  });

  afterEach(() => http.verify());

  it('aggiorna immediatamente lo stile dopo la lettura e gestisce gli errori', async () => {
    component.loadNotifications();
    http.expectOne('/api/v1/notifications').flush({ data: [{ id: 1, type: 'report_updated', title: 'Risolta', message: 'Test', createdAt: '2026-09-07T17:00:00Z', read: false }] });
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.notification-card').click();
    http.expectOne('/api/v1/notifications/1/read').flush({ data: { read: true } });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.notification-card--read')).not.toBeNull();
    component.loadNotifications();
    http.expectOne('/api/v1/notifications').flush({}, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Impossibile caricare');
    expect(fixture.nativeElement.textContent).not.toContain('Nessuna notifica presente');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ricarica le notifiche quando si rientra nella pagina', () => {
    component.ionViewDidEnter();
    component.ionViewDidEnter();
    http.expectOne('/api/v1/notifications').flush({ data: [{
      id: 1, type: 'report_updated', title: 'Segnalazione aggiornata', message: 'Risolta',
      createdAt: '2026-09-07T17:52:18.250Z', read: false,
    }] });
    expect(component.notificationGroups[0].notifications[0].title).toBe('Segnalazione aggiornata');
  });
});
