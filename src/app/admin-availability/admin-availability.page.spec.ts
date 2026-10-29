import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AdminAvailabilityPage } from './admin-availability.page';
describe('AdminAvailabilityPage', () => {
  async function setup() {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(AdminAvailabilityPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne('/api/v1/admin/spaces').flush({
      data: [{ id: 1, name: 'Aula Studio A1' }],
    });
    await fixture.whenStable();
    http.expectOne('/api/v1/admin/spaces/1/availability').flush({ data: [] });
    http.expectOne('/api/v1/admin/spaces/1/unavailability').flush({ data: [] });
    await fixture.whenStable();
    return { fixture, http };
  }

  it('blocca giorni, periodi e orari invalidi prima della richiesta', async () => {
    const { fixture, http } = await setup();
    const page = fixture.componentInstance;
    page.form.setValue({
      validFrom: '2026-11-20',
      validUntil: '2026-11-19',
      weekday: null,
      startTime: '15:00',
      endTime: '14:00',
    });
    page.create();
    fixture.detectChanges();
    expect(page.form.invalid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('La data finale deve essere');
    expect(fixture.nativeElement.textContent).toContain("L'ora finale deve essere");
    expect(fixture.nativeElement.textContent).toContain('Seleziona un giorno');
    http.expectNone('/api/v1/admin/spaces/1/availability');
    http.verify();
  });

  it('invia una sola fascia con payload invariato e consente modifica e retry', async () => {
    const { fixture, http } = await setup();
    const page = fixture.componentInstance;
    page.form.setValue({
      validFrom: '2026-11-01',
      validUntil: '2026-11-30',
      weekday: 3,
      startTime: '09:00',
      endTime: '12:00',
    });
    page.create();
    page.create();
    const payload = {
      validFrom: '2026-11-01', validUntil: '2026-11-30', weekday: 3,
      startTime: '09:00', endTime: '12:00',
    };
    const create = http.expectOne('/api/v1/admin/spaces/1/availability');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(payload);
    expect(page.savingSchedule).toBe(true);
    expect(page.form.disabled).toBe(true);
    create.flush({}, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(page.savingSchedule).toBe(false);
    expect(page.form.enabled).toBe(true);
    expect(page.form.getRawValue()).toEqual(payload);
    page.create();
    http.expectOne('/api/v1/admin/spaces/1/availability').flush({});
    http.expectOne('/api/v1/admin/spaces/1/availability').flush({ data: [] });
    http.expectOne('/api/v1/admin/spaces/1/unavailability').flush({ data: [] });
    await fixture.whenStable();
    page.edit({ availabilityId: 8, ...payload, isRetired: false });
    expect(page.reusingId).toBeNull();
    page.create();
    const update = http.expectOne('/api/v1/admin/spaces/1/availability/8');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual(payload);
    update.flush({});
    http.expectOne('/api/v1/admin/spaces/1/availability').flush({ data: [] });
    http.expectOne('/api/v1/admin/spaces/1/unavailability').flush({ data: [] });
    http.verify();
  });

  it('azzera il modulo e ignora risposte obsolete quando cambia lo spazio', async () => {
    const { fixture, http } = await setup();
    const page = fixture.componentInstance;
    page.rows = [{
      availabilityId: 8, validFrom: '2026-11-01', validUntil: '2026-11-30',
      weekday: 3, startTime: '09:00', endTime: '12:00', isRetired: false,
    }];
    page.edit(page.rows[0]);
    page.spaceId = 2;
    page.selectSpace();
    expect(page.rows).toEqual([]);
    expect(page.form.getRawValue().weekday).toBe(1);
    expect(page.form.getRawValue().startTime).toBe('08:00');
    expect(page.editingId).toBeNull();
    const oldAvailability = http.expectOne('/api/v1/admin/spaces/2/availability');
    const oldException = http.expectOne('/api/v1/admin/spaces/2/unavailability');
    page.spaceId = 3;
    page.selectSpace();
    http.expectOne('/api/v1/admin/spaces/3/availability').flush({ data: [{
      availabilityId: 30, validFrom: '2026-12-01', validUntil: '2026-12-31',
      weekday: 4, startTime: '10:00', endTime: '11:00', isRetired: false,
    }] });
    http.expectOne('/api/v1/admin/spaces/3/unavailability').flush({ data: [] });
    oldAvailability.flush({ data: [{
      availabilityId: 20, validFrom: '2026-11-01', validUntil: '2026-11-30',
      weekday: 3, startTime: '09:00', endTime: '12:00', isRetired: false,
    }] });
    oldException.flush({ data: [{
      id: 2, date: '2026-11-01', startTime: '09:00', endTime: '12:00', reason: 'Vecchio spazio',
    }] });
    expect(page.rows.map((row) => row.availabilityId)).toEqual([30]);
    expect(page.unavailabilities).toEqual([]);
    page.spaceId = 0;
    page.selectSpace();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Indisponibilità eccezionali');
    http.verify();
  });

  it('valida motivo e ordine orario delle indisponibilità senza inviare', async () => {
    const { fixture, http } = await setup();
    const page = fixture.componentInstance;
    page.exceptionForm.setValue({
      date: '2026-11-05', startTime: '12:00', endTime: '11:00', reason: '   ',
    });
    page.createException();
    fixture.detectChanges();
    expect(page.exceptionForm.invalid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Indica il motivo');
    expect(fixture.nativeElement.textContent).toContain("L'ora finale deve essere");
    http.expectNone('/api/v1/admin/spaces/1/unavailability');
    http.verify();
  });

  it('invia una sola indisponibilità, conserva i dati dopo errore e azzera il motivo dopo successo', async () => {
    const { fixture, http } = await setup();
    const page = fixture.componentInstance;
    const previousRow = {
      availabilityId: 4, validFrom: '2026-11-01', validUntil: '2026-11-30',
      weekday: 3, startTime: '09:00', endTime: '12:00', isRetired: false,
    };
    page.rows = [previousRow];
    const payload = {
      date: '2026-11-05', startTime: '10:00', endTime: '11:00', reason: 'Manutenzione',
    };
    page.exceptionForm.setValue(payload);
    page.createException();
    page.createException();
    const first = http.expectOne('/api/v1/admin/spaces/1/unavailability');
    expect(first.request.method).toBe('POST');
    expect(first.request.body).toEqual(payload);
    expect(page.savingException).toBe(true);
    first.flush({}, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(page.savingException).toBe(false);
    expect(page.exceptionForm.getRawValue()).toEqual(payload);
    page.createException();
    http.expectOne('/api/v1/admin/spaces/1/unavailability').flush({});
    expect(page.rows).toEqual([previousRow]);
    http.expectOne('/api/v1/admin/spaces/1/availability').flush({ data: [previousRow] });
    http.expectOne('/api/v1/admin/spaces/1/unavailability').flush({ data: [] });
    expect(page.rows).toEqual([previousRow]);
    expect(page.exceptionForm.getRawValue().reason).toBe('');
    expect(page.exceptionForm.getRawValue().date).toBe(payload.date);
    http.verify();
  });

  it('carica anche gli spazi oltre la prima pagina', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(AdminAvailabilityPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne('/api/v1/admin/spaces').flush({
      data: [{ id: 1, name: 'Primo spazio' }],
      pagination: { page: 1, totalPages: 2 },
    });
    http.expectOne('/api/v1/admin/spaces?page=2').flush({
      data: [{ id: 21, name: 'Ventunesimo spazio' }],
      pagination: { page: 2, totalPages: 2 },
    });
    await fixture.whenStable();
    expect(fixture.componentInstance.spaces.map((space) => space.id)).toEqual([1, 21]);
    http.expectOne('/api/v1/admin/spaces/1/availability').flush({ data: [] });
    http.expectOne('/api/v1/admin/spaces/1/unavailability').flush({ data: [] });
    http.verify();
  });

  it('blocca richieste duplicate di ritiro e rimozione, lasciando il retry dopo errore', async () => {
    const { fixture, http } = await setup();
    const page = fixture.componentInstance;
    const row = {
      availabilityId: 8, validFrom: '2026-11-01', validUntil: '2026-11-30',
      weekday: 3, startTime: '09:00', endTime: '12:00', isRetired: false,
    };
    const exception = {
      id: 5, date: '2026-11-05', startTime: '10:00',
      endTime: '11:00', reason: 'Manutenzione',
    };
    page.rows = [row];
    page.unavailabilities = [exception];
    page.retire(row);
    page.retire(row);
    const retire = http.expectOne('/api/v1/admin/spaces/1/availability/8');
    expect(retire.request.method).toBe('DELETE');
    expect(page.busyRow).toBe('availability:8');
    retire.flush({}, { status: 409, statusText: 'Conflict' });
    expect(page.busyRow).toBeNull();
    page.removeException(exception);
    page.removeException(exception);
    const remove = http.expectOne('/api/v1/admin/spaces/1/unavailability/5');
    expect(remove.request.method).toBe('DELETE');
    remove.flush({});
    http.expectOne('/api/v1/admin/spaces/1/availability').flush({ data: [row] });
    http.expectOne('/api/v1/admin/spaces/1/unavailability').flush({ data: [] });
    expect(page.unavailabilities).toEqual([]);
    http.verify();
  });

  it('mostra fasce, indisponibilità ed errori alla risposta HTTP', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const fixture = TestBed.createComponent(AdminAvailabilityPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
    http
      .expectOne('/api/v1/admin/spaces')
      .flush({ data: [{ id: 1, name: 'Aula Studio A1' }] });
    await fixture.whenStable();
    http.expectOne('/api/v1/admin/spaces/1/availability').flush({
      data: [
        {
          availabilityId: 1,
          validFrom: '2026-09-01',
          validUntil: '2026-09-30',
          weekday: 1,
          startTime: '09:00',
          endTime: '11:00',
          isRetired: false,
        },
        {
          availabilityId: 2,
          validFrom: '2026-10-01',
          validUntil: '2026-10-31',
          weekday: 2,
          startTime: '12:00',
          endTime: '13:00',
          isRetired: true,
        },
      ],
    });
    http
      .expectOne('/api/v1/admin/spaces/1/unavailability')
      .flush({
        data: [
          {
            id: 1,
            date: '2026-09-14',
            startTime: '09:00',
            endTime: '11:00',
            reason: 'Manutenzione programmata',
          },
        ],
      });
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('.availability-rows'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement
        .querySelector('.availability-rows')
        .getAttribute('tabindex'),
    ).toBe('0');
    expect(
      fixture.nativeElement.querySelector('[aria-label="Fasce configurate"]')
        .textContent,
    ).toContain('09:00–11:00');
    expect(
      fixture.nativeElement.querySelector('[aria-label="Fasce configurate"]')
        .textContent,
    ).not.toContain('12:00–13:00');
    fixture.nativeElement.querySelector('.history-toggle').click();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[aria-label="Fasce configurate"]')
        .textContent,
    ).toContain('12:00–13:00');
    fixture.nativeElement.querySelector('.reuse-button').click();
    expect(fixture.componentInstance.editingId).toBeNull();
    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      validFrom: '2026-10-01',
      validUntil: '2026-10-31',
      weekday: 2,
      startTime: '12:00',
      endTime: '13:00',
    });
    expect(
      fixture.nativeElement.querySelector('[aria-label="Indisponibilità"]')
        .textContent,
    ).toContain('Manutenzione programmata');
    fixture.componentInstance.create();
    http
      .expectOne('/api/v1/admin/spaces/1/availability/2/reuse')
      .flush({}, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('[role="alert"]')?.textContent,
    ).toContain('sovrappone');
    http.verify();
  });
});
