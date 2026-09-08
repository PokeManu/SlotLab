import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { HomePage } from './home.page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(), provideHttpClientTesting(),
      ],
    });

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);

  });

  it('should create', () => {
    http.expectOne('/api/v1/spaces/recommended').flush({ data: [] });
    http.expectOne('/api/v1/bookings').flush({ data: [] });
    expect(component).toBeTruthy();
  });
  it('mostra le card alla prima risposta HTTP senza interazioni', async () => {
    await fixture.whenStable();
    http.expectOne('/api/v1/spaces/recommended').flush({ data: [
      { id: 1, name: 'Aula Studio A1', type: 'study_room', building: { name: 'Edificio 6' }, floor: 2, capacity: 24 },
    ] });
    http.expectOne('/api/v1/bookings').flush({ data: [] });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('app-space-card').length).toBe(1);
    http.expectOne('/api/v1/buildings').flush({ data: [] });
    http.expectOne('/api/v1/spaces?size=100').flush({ data: [] });
    http.verify();
  });

  it('apre la prenotazione concreta dalla card Home', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.openBooking('42');
    expect(navigate).toHaveBeenCalledWith(['/bookings'], { queryParams: { bookingId: '42' } });
  });

  it('apre tutti gli spazi dalla Home', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.openAllSpaces();
    expect(navigate).toHaveBeenCalledWith(['/spaces']);
  });
});
