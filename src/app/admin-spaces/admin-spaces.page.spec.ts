import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminSpacesPage } from './admin-spaces.page';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
describe('AdminSpacesPage', () => {
  let component: AdminSpacesPage;
  let fixture: ComponentFixture<AdminSpacesPage>;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
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
    const space = {
      id: 1,
      name: 'Aula Studio A1',
      building: { id: 1, name: 'Edificio 6' },
      floor: 2,
      capacity: 24,
      type: 'study_room',
      status: 'active',
      accessible: true,
    };
    http.expectOne('/api/v1/admin/buildings').flush({ data: [space.building] });
    http.expectOne('/api/v1/admin/spaces').flush({ data: [space] });
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('.space-row strong')?.textContent,
    ).toContain(space.name);
    component.editSpace(component.spaces[0]);
    http.expectOne('/api/v1/admin/spaces/1').flush({ data: space });
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('ion-input[formcontrolname="name"]')?.value,
    ).toBe(space.name);
    expect(component.form.controls.buildingId.value).toBe(1);
    http.verify();
  });
  it('valida il form, blocca il doppio invio e conserva i valori dopo un errore', async () => {
    http.expectOne('/api/v1/admin/buildings').flush({ data: [{ id: 6, name: 'Edificio 6' }] });
    http.expectOne('/api/v1/admin/spaces').flush({ data: [] });
    component.startCreate();
    component.saveSpace();
    fixture.detectChanges();
    http.expectNone({ method: 'POST', url: '/api/v1/admin/spaces' });
    expect(fixture.nativeElement.querySelector('ion-select[formcontrolname="buildingId"]').getAttribute('aria-invalid')).toBe('true');
    component.form.setValue({
      buildingId: 6,
      name: 'Aula studio',
      floor: -1,
      type: 'study_room',
      capacity: 24,
      accessible: true,
      status: 'active',
      serviceCodes: ['wifi'],
    });
    component.form.controls.status.setValue('maintenance');
    component.onStatusChange('maintenance');
    expect(component.form.controls.accessible.disabled).toBe(true);
    component.saveSpace();
    component.saveSpace();
    const failed = http.expectOne({ method: 'POST', url: '/api/v1/admin/spaces' });
    expect(failed.request.body).toEqual({
      buildingId: 6, name: 'Aula studio', floor: -1, type: 'study_room',
      capacity: 24, accessible: false, status: 'maintenance', serviceCodes: ['wifi'],
    });
    failed.flush({}, { status: 400, statusText: 'Bad Request' });
    expect(component.saving).toBe(false);
    expect(component.form.controls.name.value).toBe('Aula studio');
    expect(component.form.controls.accessible.disabled).toBe(true);
    component.saveSpace();
    http.expectOne({ method: 'POST', url: '/api/v1/admin/spaces' }).flush({ data: { id: 3 } });
    http.expectOne('/api/v1/admin/spaces').flush({ data: [] });
    await fixture.whenStable();
    expect(component.showCreate).toBe(false);
    expect(component.form.controls.name.value).toBe('');
    http.verify();
  });
  it('conserva il payload di modifica e il binding numerico Ionic', async () => {
    const space = {
      id: 4, name: 'Laboratorio', building: { id: 6, name: 'Edificio 6' },
      floor: 2, capacity: 30, type: 'laboratory', status: 'active',
      accessible: true, serviceCodes: ['computer'],
    };
    http.expectOne('/api/v1/admin/buildings').flush({ data: [space.building] });
    http.expectOne('/api/v1/admin/spaces').flush({ data: [space] });
    await fixture.whenStable();
    component.editSpace(component.spaces[0]);
    http.expectOne('/api/v1/admin/spaces/4').flush({ data: space });
    await fixture.whenStable();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('ion-input[formcontrolname="capacity"]') as HTMLIonInputElement;
    input.value = '32';
    input.dispatchEvent(new CustomEvent('ionInput', { bubbles: true, detail: { value: '32' } }));
    expect(component.form.controls.capacity.value).toBe(32);
    component.setService('wifi', true);
    component.saveSpace();
    const request = http.expectOne({ method: 'PATCH', url: '/api/v1/admin/spaces/4' });
    expect(request.request.body).toEqual({
      buildingId: 6, name: 'Laboratorio', floor: 2, type: 'laboratory',
      capacity: 32, accessible: true, status: 'active', serviceCodes: ['computer', 'wifi'],
    });
    request.flush({ data: space });
    http.expectOne('/api/v1/admin/spaces').flush({ data: [space] });
    http.verify();
  });
  it('rende riconoscibile e accessibile il comando per eliminare uno spazio', async () => {
    const space = {
      id: 1,
      name: 'Aula Studio A1',
      building: { id: 1, name: 'Edificio 6' },
      floor: 2,
      capacity: 24,
      type: 'study_room',
      status: 'active',
      accessible: true,
    };
    http.expectOne('/api/v1/admin/buildings').flush({ data: [space.building] });
    http.expectOne('/api/v1/admin/spaces').flush({ data: [space] });
    await fixture.whenStable();
    fixture.detectChanges();
    const deleteButton = fixture.nativeElement.querySelector(
      '.icon-button--danger',
    ) as HTMLIonButtonElement;
    expect(deleteButton).not.toBeNull();
    expect(deleteButton.shadowRoot?.querySelector('button')?.getAttribute('aria-label')).toBe(
      `Elimina ${space.name}`,
    );
    expect(deleteButton.querySelector('ion-icon')?.getAttribute('name')).toBe(
      'trash-outline',
    );
    http.verify();
  });
  it('chiede conferma Ionic prima del DELETE e impedisce doppi invii', async () => {
    const space = {
      id: 1, name: 'Aula Studio A1', building: { id: 1, name: 'Edificio 6' },
      floor: 2, capacity: 24, type: 'study_room', status: 'active', accessible: true,
    };
    http.expectOne('/api/v1/admin/buildings').flush({ data: [space.building] });
    http.expectOne('/api/v1/admin/spaces').flush({ data: [space] });
    await fixture.whenStable();
    component.removeSpace(component.spaces[0]);
    fixture.detectChanges();
    expect(component.pendingDelete?.id).toBe(1);
    expect(fixture.nativeElement.querySelector('ion-alert')).not.toBeNull();
    http.expectNone({ method: 'DELETE', url: '/api/v1/admin/spaces/1' });
    component.pendingDelete = null;
    component.removeSpace(component.spaces[0]);
    component.confirmRemoveSpace();
    component.confirmRemoveSpace();
    expect(component.deletingId).toBe(1);
    http.expectOne({ method: 'DELETE', url: '/api/v1/admin/spaces/1' }).flush({});
    http.expectOne('/api/v1/admin/spaces').flush({ data: [] });
    expect(component.deletingId).toBeNull();
    http.verify();
  });
  it('applica i filtri Ionic, torna alla prima pagina e mantiene le azioni', async () => {
    const building = { id: 6, name: 'Edificio 6' };
    const spaces = Array.from({ length: 21 }, (_, index) => ({
      id: index + 1,
      name: `Spazio ${index + 1}`,
      building,
      capacity: 12,
      type: index === 20 ? 'laboratory' : 'study_room',
      status: 'active',
    }));
    http.expectOne('/api/v1/admin/buildings').flush({ data: [building] });
    http.expectOne('/api/v1/admin/spaces').flush({ data: spaces });
    await fixture.whenStable();
    component.currentPage = 2;
    fixture.detectChanges();
    expect(component.visibleSpaces[0].name).toBe('Spazio 21');
    const filter = fixture.nativeElement.querySelectorAll('.space-filters ion-select')[1] as HTMLIonSelectElement;
    filter.value = 'laboratory';
    filter.dispatchEvent(new CustomEvent('ionChange', { bubbles: true, detail: { value: 'laboratory' } }));
    await fixture.whenStable();
    expect(component.filterType).toBe('laboratory');
    expect(component.currentPage).toBe(1);
    expect(component.visibleSpaces.map((space) => space.name)).toEqual(['Spazio 21']);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.space-row__actions ion-button')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('.pagination__current')?.getAttribute('aria-current')).toBe('page');
    http.verify();
  });
});
