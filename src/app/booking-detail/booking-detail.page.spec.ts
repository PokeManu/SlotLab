import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserBookingDetailPage } from './booking-detail.page';
import { Auth } from '../auth/auth';

describe('UserBookingDetailPage', () => {
  const organizer = { id: 1, participantId: 40, firstName: 'Primo', lastName: 'Utente', email: 'uno@example.test', participantRole: 'organizer', present: false };
  const other = { ...organizer, id: 2, participantId: 90, participantRole: 'participant', email: 'due@example.test' };
  const booking = { id: 7, spaceId: 12, spaceName: 'Aula', date: '2026-09-14', startTime: '10:00', endTime: '12:00', participants: [organizer, other] };
  let userId: number;
  beforeEach(() => {
    userId = 1;
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: Auth, useValue: { user: () => ({ id: userId }) } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 7 }) } } },
    ] });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('cancella dati obsoleti e recupera dopo un errore senza collegamenti diretti al check-in', async () => {
    const fixture = TestBed.createComponent(UserBookingDetailPage); fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/bookings/7').flush({ data: booking });
    fixture.componentInstance.load();
    expect(fixture.componentInstance.booking()).toBeNull();
    http.expectOne('/api/v1/bookings/7').flush({}, { status: 500, statusText: 'Error' });
    fixture.componentInstance.load();
    http.expectOne('/api/v1/bookings/7').flush({ data: booking });
    await fixture.whenStable();
    expect(fixture.componentInstance.error()).toBe('');
    expect(fixture.nativeElement.querySelector('a[href^="/check-in"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('QR affisso');
  });

  it('aggiunge tramite email e rimuove usando ID partecipazione, non ID utente', async () => {
    const fixture = TestBed.createComponent(UserBookingDetailPage);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/bookings/7').flush({ data: booking });
    fixture.componentInstance.email = ' terzo@example.test ';
    fixture.componentInstance.add(); fixture.componentInstance.add();
    const add = http.expectOne({ method: 'POST', url: '/api/v1/bookings/7/participants' });
    expect(add.request.body).toEqual({ email: 'terzo@example.test' });
    add.flush({});
    http.expectOne('/api/v1/bookings/7').flush({ data: booking });
    fixture.componentInstance.remove(other);
    http.expectOne({ method: 'DELETE', url: '/api/v1/bookings/7/participants/90' }).flush(null);
    http.expectOne('/api/v1/bookings/7').flush({ data: { ...booking, participants: [organizer] } });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('due@example.test');
  });
  it('permette al partecipante di uscire senza mostrare aggiunta e rimozione altrui', async () => {
    userId = 2;
    const fixture = TestBed.createComponent(UserBookingDetailPage); fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/bookings/7').flush({ data: booking });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Abbandona prenotazione');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.remove(other);
    http.expectOne('/api/v1/bookings/7/participants/90').flush(null);
    expect(navigate).toHaveBeenCalledWith(['/bookings']);
  });
});
