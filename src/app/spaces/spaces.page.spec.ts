import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { SpacesPage } from './spaces.page';
describe('SpacesPage', () => {
  let component: SpacesPage;
  let fixture: ComponentFixture<SpacesPage>;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(SpacesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/v1/spaces')
      .flush({
        data: [
          {
            id: 1,
            name: 'Aula test',
            type: 'study_room',
            building: { name: 'Edificio 6' },
            floor: 2,
            capacity: 24,
          },
        ],
      });
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('mostra gli spazi ricevuti senza cambiare pagina', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aula test');
  });
  it('lascia header e navigazione al layout globale', () => {
    expect(fixture.nativeElement.querySelector('app-topbar')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-mobile-navigation')).toBeNull();
    expect(fixture.nativeElement.querySelector('ion-content')).toBeTruthy();
  });
  it('mantiene più spazi nei preferiti', () => {
    component.toggleFavorite('1');
    http
      .expectOne('/api/v1/favorites/1')
      .flush({ data: { spaceId: 1, isFavorite: true } });
    component.toggleFavorite('2');
    http
      .expectOne('/api/v1/favorites/2')
      .flush({ data: { spaceId: 2, isFavorite: true } });
    expect(component.favoriteSpaceIds).toEqual(new Set(['1', '2']));
  });
  it('riallinea le icone con i preferiti salvati', () => {
    component.ionViewDidEnter();
    http.expectOne('/api/v1/favorites').flush({ data: [{ id: 1 }, { id: 3 }] });
    expect(component.favoriteSpaceIds).toEqual(new Set(['1', '3']));
  });
  it('annulla la ricerca precedente quando i filtri cambiano rapidamente', () => {
    component.searchSpaces('prima');
    const previous = http.expectOne('/api/v1/spaces?search=prima');
    component.searchSpaces('seconda');
    expect(previous.cancelled).toBe(true);
    http.expectOne('/api/v1/spaces?search=seconda').flush({
      data: [
        {
          id: 2,
          name: 'Aula seconda',
          type: 'study_room',
          building: { name: 'Edificio 2' },
          floor: 1,
          capacity: 12,
          status: 'active',
        },
      ],
    });
    expect(component.spaces.map((space) => space.name)).toEqual([
      'Aula seconda',
    ]);
  });
});
