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
