import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AdminStatisticsPage } from './admin-statistics.page';
function statistics(overrides: Record<string, unknown> = {}) {
  return {
    dateFrom: '2026-09-01',
    dateTo: '2026-09-08',
    bookings: 2,
    participants: 3,
    presences: 2,
    absences: 1,
    offeredCapacity: 20,
    utilizationRate: 10,
    checkInRate: 67,
    daily: [{ date: '2026-09-02', bookings: 2 }],
    usage: [{ type: 'study_room', presences: 2, percentage: 100 }],
    mostBookedSpaces: [
      {
        spaceId: 1,
        spaceName: 'Aula A1',
        bookings: 2,
        participants: 3,
        presences: 2,
      },
    ],
    mostUsedSlots: [
      {
        startTime: '10:00',
        endTime: '12:00',
        bookings: 2,
        participants: 3,
        presences: 2,
      },
    ],
    reportsByCategory: [{ category: 'technical', count: 1 }],
    reportsByStatus: [{ status: 'open', count: 1 }],
    history: { trackingStartedAt: null, complete: true, excludedBookings: 0 },
    ...overrides,
  };
}
describe('AdminStatisticsPage', () => {
  let component: AdminStatisticsPage;
  let fixture: ComponentFixture<AdminStatisticsPage>;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(AdminStatisticsPage);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());
  it('richiede il periodo con i parametri del contratto e collega gli indicatori', () => {
    const request = http.expectOne(
      `/api/v1/admin/statistics?dateFrom=${component.dateFrom}&dateTo=${component.dateTo}`,
    );
    request.flush({ data: statistics() });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.donut-chart__center strong')
        .textContent,
    ).toBe('2');
    expect(component.chartScale).toEqual([4, 3, 2, 1, 0]);
    expect(component.statistics?.bookings).toBe(2);
    expect(component.metrics[0].value).toBe('2');
    expect(component.metrics[1].value).toBe('10%');
    expect(component.metrics[2].value).toBe('67%');
    expect(component.dailyBookings[0].heightPercent).toBe(50);
    expect(component.mostBookedSpaces[0].spaceName).toBe('Aula A1');
    expect(component.reportsByCategory[0].count).toBe(1);
  });
  it('mostra N/D per rapporti con denominatore zero e avvisa per storia incompleta', () => {
    const request = http.expectOne(() => true);
    request.flush({
      data: statistics({
        utilizationRate: null,
        checkInRate: null,
        history: {
          trackingStartedAt: '2026-09-05T10:00:00.000Z',
          complete: false,
          excludedBookings: 2,
        },
      }),
    });
    fixture.detectChanges();
    expect(component.metrics[1].value).toBe('N/D');
    expect(component.metrics[2].value).toBe('N/D');
    expect(component.historyMessage).toContain('Storia parziale');
  });
  it('rende N/D l’utilizzo quando il backend segnala fasce ambigue o mancanti', () => {
    const request = http.expectOne(() => true);
    request.flush({
      data: statistics({
        utilizationRate: 25,
        history: {
          trackingStartedAt: '2026-09-01T10:00:00.000Z',
          complete: true,
          excludedBookings: 0,
          ambiguousOccurrences: 1,
          gapOccurrences: 2,
        },
      }),
    });
    fixture.detectChanges();
    expect(component.metrics[1].value).toBe('N/D');
    expect(component.historyMessage).toContain(
      '1 fasce ambigue e 2 fasce mancanti',
    );
  });
  it('applica una coppia di date selezionata e ricarica al rientro', () => {
    const initial = http.expectOne(() => true);
    initial.flush({ data: statistics() });
    fixture.detectChanges();
    component.changeDate('from', '2026-08-01');
    component.changeDate('to', '2026-08-31');
    component.applyPeriod();
    const changed = http.expectOne(
      '/api/v1/admin/statistics?dateFrom=2026-08-01&dateTo=2026-08-31',
    );
    changed.flush({
      data: statistics({ dateFrom: '2026-08-01', dateTo: '2026-08-31' }),
    });
    fixture.detectChanges();
    expect(component.dateFrom).toBe('2026-08-01');
    expect(component.dateTo).toBe('2026-08-31');
    component.ionViewDidEnter();
    component.ionViewDidEnter();
    http
      .expectOne(
        '/api/v1/admin/statistics?dateFrom=2026-08-01&dateTo=2026-08-31',
      )
      .flush({
        data: statistics({ dateFrom: '2026-08-01', dateTo: '2026-08-31' }),
      });
  });
  it('rifiuta un intervallo invertito senza inviare la richiesta', () => {
    const initial = http.expectOne(() => true);
    initial.flush({ data: statistics() });
    fixture.detectChanges();
    component.changeDate('from', '2026-09-30');
    component.changeDate('to', '2026-09-01');
    component.applyPeriod();
    expect(component.rangeError).toContain('precedere');
    http.expectNone(
      '/api/v1/admin/statistics?dateFrom=2026-09-30&dateTo=2026-09-01',
    );
  });
  it('azzera i dati precedenti quando la richiesta fallisce', () => {
    const initial = http.expectOne(() => true);
    initial.flush({ data: statistics() });
    fixture.detectChanges();
    component.applyPeriod();
    const failed = http.expectOne(() => true);
    failed.flush(
      { error: { error: { code: 'INTERNAL_ERROR' } } },
      { status: 500, statusText: 'Server Error' },
    );
    fixture.detectChanges();
    expect(component.statistics).toBeNull();
    expect(component.dailyBookings).toEqual([]);
    expect(component.error).toContain('Impossibile');
  });
  it('non sovrascrive le date modificate durante il caricamento e aggiorna il DOM', async () => {
    const request = http.expectOne(() => true);
    component.changeDate('from', '2026-08-01');
    request.flush({ data: statistics() });
    await fixture.whenStable();
    expect(component.dateFrom).toBe('2026-08-01');
    expect(fixture.nativeElement.textContent).toContain('Aula A1');
    expect(fixture.nativeElement.textContent).not.toContain(
      'Caricamento statistiche',
    );
  });
  it('rifiuta date inesistenti e annulla la richiesta alla distruzione', () => {
    const request = http.expectOne(() => true);
    component.changeDate('from', '2026-02-30');
    component.applyPeriod();
    expect(component.rangeIsValid).toBe(false);
    http.expectNone((req) => req.url.includes('2026-02-30'));
    fixture.destroy();
    expect(request.cancelled).toBe(true);
  });
  it('mostra lo stato vuoto delle presenze senza percentuali nulle', () => {
    http
      .expectOne(() => true)
      .flush({
        data: statistics({
          presences: 0,
          usage: [{ type: 'study_room', presences: 0, percentage: null }],
        }),
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.donut-chart')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Nessun check-in registrato',
    );
  });
});
