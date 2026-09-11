import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TopbarComponent } from './topbar-component.component';
import { NotificationState } from '../notifications/notification-state';
describe('TopbarComponent', () => {
  let component: TopbarComponent;
  let fixture: ComponentFixture<TopbarComponent>;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(TopbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('usa il logo ufficiale nella barra condivisa', () => {
    const logo = fixture.nativeElement.querySelector(
      '.topbar__brand-image',
    ) as HTMLImageElement;
    expect(logo.getAttribute('src')).toBe('assets/branding/slotlab-logo.png');
    expect(logo.alt).toBe('SlotLab');
  });
  it('mostra il numero delle notifiche non lette', () => {
    TestBed.inject(NotificationState).set(3);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.topbar__notification-badge')
        ?.textContent,
    ).toContain('3');
  });
});
