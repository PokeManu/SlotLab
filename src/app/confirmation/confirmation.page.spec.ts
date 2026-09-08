import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ConfirmationPage } from './confirmation.page';

describe('ConfirmationPage', () => {
  let component: ConfirmationPage;
  let fixture: ComponentFixture<ConfirmationPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    fixture = TestBed.createComponent(ConfirmationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('mostra aula, data e partecipanti della prenotazione salvata', async () => {
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.queryParamMap, 'get').mockReturnValue('81');
    component.load();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/bookings/81').flush({ data: {
      id: 81, spaceId: 12, spaceName: 'Aula reale', building: 'Edificio 9', floor: 3,
      date: '2026-09-14', startTime: '14:00', endTime: '15:00', participants: [{}, {}],
    } });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Aula reale');
    expect(fixture.nativeElement.textContent).toContain('14/09/2026');
    expect(fixture.nativeElement.textContent).toContain('2 partecipanti');
    expect(fixture.nativeElement.querySelector('.qr-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-space-qr')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('codice QR affisso nell’aula');
    TestBed.inject(HttpTestingController).verify();
  });

});
