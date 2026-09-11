import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { SpaceDetailPage } from './space-detail.page';
describe('SpaceDetailPage', () => {
  let component: SpaceDetailPage;
  let fixture: ComponentFixture<SpaceDetailPage>;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } },
        },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(SpaceDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http
      .match((request) => request.urlWithParams.startsWith('/api/v1/spaces/'))
      .forEach((testRequest) =>
        testRequest.flush({
          data: testRequest.request.urlWithParams.includes('/availability')
            ? []
            : {
                id: 1,
                name: 'Test',
                building: { name: 'Edificio' },
                floor: 1,
                type: 'study_room',
                capacity: 10,
                accessible: true,
                status: 'active',
                services: [],
              },
        }),
      );
    http
      .match((request) => request.url.includes('/availability'))
      .forEach((request) => request.flush({ data: [] }));
  });
  afterEach(() => http.verify());
  it('mostra l’anteprima dopo il caricamento dello spazio reale', async () => {
    await fixture.whenStable();
    const image = fixture.nativeElement.querySelector('.room-image');
    expect(image.getAttribute('src')).toBe('/assets/images/AulaStudioA1.jpg');
    expect(image.getAttribute('alt')).toContain('Test');
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  function reloadAvailability() {
    component.ngOnInit();
    http.expectOne('/api/v1/spaces/1').flush({
      data: {
        id: 1,
        name: 'Test',
        building: { name: 'Edificio' },
        floor: 1,
        type: 'study_room',
        capacity: 10,
        accessible: true,
        status: 'active',
        services: [],
      },
    });
    return http.expectOne((request) => request.url.includes('/availability'));
  }
  it('mostra i posti residui della prima fascia prenotabile e si aggiorna al rientro', async () => {
    reloadAvailability().flush({
      data: [
        {
          bookable: false,
          availableSeats: 0,
          startTime: '09:00',
          endTime: '10:00',
        },
        {
          bookable: true,
          availableSeats: 3,
          startTime: '11:00',
          endTime: '12:00',
        },
        {
          bookable: true,
          availableSeats: 8,
          startTime: '14:00',
          endTime: '15:00',
        },
      ],
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('3 posti disponibili');
    expect(fixture.nativeElement.textContent).toContain('11:00–12:00');
    expect(fixture.nativeElement.textContent).toContain(
      'Capienza totale: 10 posti',
    );
    component.ionViewWillEnter();
    component.ionViewWillEnter();
    http.expectOne('/api/v1/spaces/1').flush({
      data: {
        id: 1,
        name: 'Test',
        building: { name: 'Edificio' },
        floor: 1,
        type: 'study_room',
        capacity: 10,
        accessible: true,
        status: 'active',
        services: [],
      },
    });
    http
      .expectOne((request) => request.url.includes('/availability'))
      .flush({
        data: [
          {
            bookable: true,
            availableSeats: 1,
            startTime: '11:00',
            endTime: '12:00',
          },
        ],
      });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('1 posto disponibile');
  });
  it('distingue errore di caricamento da nessuna fascia prenotabile', async () => {
    reloadAvailability().flush({ data: [] });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(
      'Nessuna fascia prenotabile oggi',
    );
    reloadAvailability().flush({}, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(component.availableSeats).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Impossibile verificare',
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      'Nessuna fascia prenotabile oggi',
    );
  });
  it('non richiede disponibilità e disabilita la prenotazione per uno spazio in manutenzione', async () => {
    component.ngOnInit();
    http.expectOne('/api/v1/spaces/1').flush({
      data: {
        id: 1,
        name: 'Test',
        building: { name: 'Edificio' },
        floor: 1,
        type: 'study_room',
        capacity: 10,
        accessible: true,
        status: 'maintenance',
        services: [],
      },
    });
    http.expectNone((request) => request.url.includes('/availability'));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(
      'temporaneamente in manutenzione',
    );
    expect(
      fixture.nativeElement.querySelector('.primary-button').disabled,
    ).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('Accessibile');
  });
  it('associa testi italiani e icone distinte ai cinque servizi reali', () => {
    component.space.services = [
      'wifi',
      'power_outlets',
      'projector',
      'computer',
      'air_conditioning',
    ];
    fixture.detectChanges();
    const cards = Array.from(
      fixture.nativeElement.querySelectorAll('.service-card'),
    ) as HTMLElement[];
    expect(cards.map((card) => card.textContent?.trim())).toEqual([
      'Wi-Fi',
      'Prese elettriche',
      'Proiettore',
      'Computer',
      'Aria condizionata',
    ]);
    expect(
      cards.map(
        (card) =>
          (
            card.querySelector('ion-icon') as HTMLElement & {
              name: string;
            }
          )?.name,
      ),
    ).toEqual([
      'wifi-outline',
      'flash-outline',
      'easel-outline',
      'desktop-outline',
      'snow-outline',
    ]);
  });
});
