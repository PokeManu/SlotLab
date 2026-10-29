import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AdminBuildingsPage } from './admin-buildings.page';

describe('AdminBuildingsPage', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function create() {
    const fixture = TestBed.createComponent(AdminBuildingsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/v1/admin/buildings').flush({ data: [] });
    return { fixture, page: fixture.componentInstance, http };
  }

  it('blocca il form invalido, un solo invio e conserva il payload dopo errore', async () => {
    const { fixture, page, http } = create();
    page.create();
    fixture.detectChanges();
    http.expectNone({ method: 'POST', url: '/api/v1/admin/buildings' });
    expect(fixture.nativeElement.querySelector('ion-input[formcontrolname=number]').getAttribute('aria-invalid')).toBe('true');
    page.form.setValue({
      number: 6,
      name: 'Edificio 6',
      address: 'Viale delle Scienze',
      latitude: 38.1059,
      longitude: 13.3504,
    });
    page.create();
    page.create();
    expect(page.saving).toBe(true);
    expect(fixture.nativeElement.querySelector('ion-button[type=submit]')).not.toBeNull();
    const failed = http.expectOne({ method: 'POST', url: '/api/v1/admin/buildings' });
    expect(failed.request.body).toEqual({
      number: 6,
      name: 'Edificio 6',
      address: 'Viale delle Scienze',
      latitude: 38.1059,
      longitude: 13.3504,
    });
    failed.flush({}, { status: 400, statusText: 'Bad Request' });
    expect(page.saving).toBe(false);
    expect(page.form.controls.name.value).toBe('Edificio 6');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]')?.textContent).toContain('Dati edificio');
    page.create();
    http.expectOne({ method: 'POST', url: '/api/v1/admin/buildings' })
      .flush({ data: { id: 1 } });
    http.expectOne('/api/v1/admin/buildings').flush({ data: [] });
    await fixture.whenStable();
    expect(page.form.controls.number.value).toBe(0);
    expect(page.error).toBe('');
  });

  it('mantiene ID e dati numerici nella modifica e aggiorna la lista', async () => {
    const { fixture, page, http } = create();
    const building = {
      id: 3, number: 9, name: 'Edificio 9', address: 'Campus',
      latitude: 38.11, longitude: 13.36,
    };
    page.edit(building);
    expect(page.form.controls.number.value).toBe(9);
    page.form.controls.name.setValue('Nuovo nome');
    page.create();
    const request = http.expectOne('/api/v1/admin/buildings/3');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      number: 9, name: 'Nuovo nome', address: 'Campus',
      latitude: 38.11, longitude: 13.36,
    });
    request.flush({ data: { ...building, name: 'Nuovo nome' } });
    http.expectOne('/api/v1/admin/buildings').flush({ data: [building] });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.table strong')?.textContent).toBe(building.name);
    expect(fixture.nativeElement.querySelectorAll('.row__actions ion-button')).toHaveLength(2);
  });

  it('converte il numero immesso in ion-input in un valore numerico del form', () => {
    const { fixture, page } = create();
    const input = fixture.nativeElement.querySelector('ion-input[formcontrolname=number]') as HTMLIonInputElement;
    input.value = '7';
    input.dispatchEvent(new CustomEvent('ionInput', { bubbles: true, detail: { value: '7' } }));
    expect(page.form.controls.number.value).toBe(7);
  });

  it('chiede conferma Ionic e impedisce doppie eliminazioni', () => {
    const { fixture, page, http } = create();
    const building = {
      id: 3, number: 9, name: 'Edificio 9', address: 'Campus',
      latitude: 38.11, longitude: 13.36,
    };
    page.remove(building);
    fixture.detectChanges();
    expect(page.pendingDelete?.id).toBe(3);
    expect(fixture.nativeElement.querySelector('ion-alert').isOpen).toBe(true);
    http.expectNone({ method: 'DELETE', url: '/api/v1/admin/buildings/3' });
    page.pendingDelete = null;
    page.remove(building);
    page.confirmRemove();
    page.confirmRemove();
    expect(page.deletingId).toBe(3);
    http.expectOne({ method: 'DELETE', url: '/api/v1/admin/buildings/3' }).flush({});
    http.expectOne('/api/v1/admin/buildings').flush({ data: [] });
    expect(page.deletingId).toBeNull();
  });
});
