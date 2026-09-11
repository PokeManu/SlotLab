import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AdminAvailabilityPage } from './admin-availability.page';
describe('AdminAvailabilityPage', () => {
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
    expect(fixture.componentInstance.form).toEqual({
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
