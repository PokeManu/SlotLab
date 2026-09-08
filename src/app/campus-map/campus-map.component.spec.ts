import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CampusMapComponent } from './campus-map.component';

describe('CampusMapComponent', () => {
  let component: CampusMapComponent;
  let fixture: ComponentFixture<CampusMapComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CampusMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  it('carica edifici e tutte le pagine degli spazi senza marker dimostrativi', () => {
    http.expectOne('/api/v1/buildings').flush({ data: [{ id: 7,number: 99,name: 'Edificio reale',address:'Campus',latitude:38,longitude:13 }] });
    http.expectOne('/api/v1/spaces?size=100').flush({ data: [{ id: 4,name:'Aula <script>',floor:0,type:'study_room',capacity:20,building:{id:7} }], pagination:{ page:1,totalPages:2 } });
    http.expectOne('/api/v1/spaces?size=100&page=2').flush({ data: [{ id:5,name:'Seconda aula',floor:1,type:'laboratory',capacity:10,building:{id:7} }],pagination:{page:2,totalPages:2} });
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
    http.expectOne('/api/v1/buildings').flush({data:[]});
    http.expectOne('/api/v1/spaces?size=100').flush({data:[]});
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nessun edificio disponibile');
    component['loadBuildings']();
    const buildings = http.expectOne('/api/v1/buildings');
    const spaces = http.expectOne('/api/v1/spaces?size=100');
    buildings.flush({}, {status:500,statusText:'Error'});
    expect(spaces.cancelled).toBe(true);
    fixture.detectChanges();
    expect(component.error).toContain('Impossibile caricare');
  });
});
