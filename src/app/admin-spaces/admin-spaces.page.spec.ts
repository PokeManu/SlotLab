import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminSpacesPage } from './admin-spaces.page';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

describe('AdminSpacesPage', () => {
  let component: AdminSpacesPage;
  let fixture: ComponentFixture<AdminSpacesPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    fixture = TestBed.createComponent(AdminSpacesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);

  });

  it('should create', () => {
    http.expectOne('/api/v1/admin/spaces').flush({ data: [] });
    http.expectOne('/api/v1/admin/buildings').flush({ data: [] });
    expect(component).toBeTruthy();
  });
  it('visualizza elenco e form di modifica appena arrivano le risposte', async () => {
    await fixture.whenStable();
    const space = { id: 1, name: 'Aula Studio A1', building: { id: 1, name: 'Edificio 6' }, floor: 2, capacity: 24, type: 'study_room', status: 'active', accessible: true };
    http.expectOne('/api/v1/admin/buildings').flush({ data: [space.building] });
    http.expectOne('/api/v1/admin/spaces').flush({ data: [space] });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.space-row strong')?.textContent).toContain(space.name);
    component.editSpace(component.spaces[0]);
    http.expectOne('/api/v1/admin/spaces/1').flush({ data: space });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('input[name="name"]')?.value).toBe(space.name);
    http.verify();
  });
});
