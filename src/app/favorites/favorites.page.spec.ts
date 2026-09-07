import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { FavoritesPage } from './favorites.page';

describe('FavoritesPage', () => {
  let component: FavoritesPage;
  let fixture: ComponentFixture<FavoritesPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FavoritesPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(FavoritesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/favorites').flush({ data: [] });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('mostra più preferiti ricevuti dal server', async () => {
    component.ngOnInit();
    http.expectOne('/api/v1/favorites').flush({ data: [
      { id: 1, name: 'Aula A1', building: { name: 'Edificio 6' }, floor: 2, type: 'study_room', capacity: 24, status: 'active' },
      { id: 2, name: 'Sala B', building: { name: 'Edificio 6' }, floor: 1, type: 'meeting_room', capacity: 12, status: 'active' },
    ] });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aula A1');
    expect(fixture.nativeElement.textContent).toContain('Sala B');
  });

  it('ricarica i preferiti quando si torna nella pagina', () => {
    component.ionViewDidEnter();
    http.expectOne('/api/v1/favorites').flush({ data: [{ id: 3, name: 'Laboratorio', building: { name: 'Edificio 9' }, floor: 1, type: 'laboratory', capacity: 18, status: 'active' }] });
    expect(component.favoriteSpaces.map(space => space.id)).toEqual(['3']);
  });
});
