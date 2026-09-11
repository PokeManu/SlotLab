import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CampusMapComponent } from './campus-map.component';
describe('CampusMapComponent', () => {
  let component: CampusMapComponent;
  let fixture: ComponentFixture<CampusMapComponent>;
  let http: HttpTestingController;
  let resizeCallback: ResizeObserverCallback;
  let frameCallback: FrameRequestCallback;
  const disconnectResizeObserver = vi.fn();
  beforeEach(() => {
    disconnectResizeObserver.mockClear();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resizeCallback = callback;
        }
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {
          disconnectResizeObserver();
        }
      },
    );
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frameCallback = callback;
      return 1;
    });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CampusMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it('carica edifici e tutte le pagine degli spazi senza marker dimostrativi', () => {
    http
      .expectOne('/api/v1/buildings')
      .flush({
        data: [
          {
            id: 7,
            number: 99,
            name: 'Edificio reale',
            address: 'Campus',
            latitude: 38,
            longitude: 13,
          },
        ],
      });
    http
      .expectOne('/api/v1/spaces?size=100')
      .flush({
        data: [
          {
            id: 4,
            name: 'Aula <script>',
            floor: 0,
            type: 'study_room',
            capacity: 20,
            building: { id: 7 },
          },
        ],
        pagination: { page: 1, totalPages: 2 },
      });
    http
      .expectOne('/api/v1/spaces?size=100&page=2')
      .flush({
        data: [
          {
            id: 5,
            name: 'Seconda aula',
            floor: 1,
            type: 'laboratory',
            capacity: 10,
            building: { id: 7 },
          },
        ],
        pagination: { page: 2, totalPages: 2 },
      });
    fixture.detectChanges();
    expect(component.buildings.length).toBe(1);
    expect(component.buildings[0].spaces.length).toBe(2);
    const popup = component['popupHtml'](component.buildings[0]);
    expect(popup).toContain('/spaces/4');
    expect(popup).toContain('Aula &lt;script&gt;');
    expect(popup).not.toContain('<script>');
    expect(component.loading).toBe(false);
  });
  it('distingue elenco vuoto e fallimento del caricamento', () => {
    http.expectOne('/api/v1/buildings').flush({ data: [] });
    http.expectOne('/api/v1/spaces?size=100').flush({ data: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Nessun edificio disponibile',
    );
    component['loadBuildings']();
    const buildings = http.expectOne('/api/v1/buildings');
    const spaces = http.expectOne('/api/v1/spaces?size=100');
    buildings.flush({}, { status: 500, statusText: 'Error' });
    expect(spaces.cancelled).toBe(true);
    fixture.detectChanges();
    expect(component.error).toContain('Impossibile caricare');
  });
  it('ricalcola Leaflet quando il contenitore diventa visibile', () => {
    http.expectOne('/api/v1/buildings').flush({ data: [] });
    http.expectOne('/api/v1/spaces?size=100').flush({ data: [] });
    const canvas: HTMLDivElement = fixture.nativeElement.querySelector(
      '.campus-map__canvas',
    );
    Object.defineProperties(canvas, {
      clientWidth: { configurable: true, value: 640 },
      clientHeight: { configurable: true, value: 360 },
    });
    const invalidateSize = vi.spyOn(component['map']!, 'invalidateSize');
    resizeCallback(
      [
        {
          target: canvas,
          contentRect: { width: 640, height: 360 },
        } as unknown as ResizeObserverEntry,
      ],
      component['resizeObserver']!,
    );
    frameCallback(0);
    expect(invalidateSize).toHaveBeenCalledWith({
      animate: false,
      pan: false,
    });
  });
  it("interrompe l'osservazione del layout alla distruzione", () => {
    http.expectOne('/api/v1/buildings').flush({ data: [] });
    http.expectOne('/api/v1/spaces?size=100').flush({ data: [] });
    fixture.destroy();
    expect(disconnectResizeObserver).toHaveBeenCalledOnce();
  });
});
