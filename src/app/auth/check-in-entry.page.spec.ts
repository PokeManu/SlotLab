import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CheckInEntryPage } from './check-in-entry.page';
describe('CheckInEntryPage', () => {
  let spaceId: string;
  beforeEach(() => {
    spaceId = '12';
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            get snapshot() {
              return { paramMap: convertToParamMap({ id: spaceId }) };
            },
          },
        },
      ],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('mostra il logo ufficiale nel flusso QR', () => {
    const fixture = TestBed.createComponent(CheckInEntryPage);
    fixture.detectChanges();
    const logo = fixture.nativeElement.querySelector(
      '.check-in__brand img',
    ) as HTMLImageElement;
    expect(logo.getAttribute('src')).toBe('assets/branding/slotlab-logo.png');
  });
  it('mostra subito successo e ripetizione, impedendo richieste simultanee', async () => {
    const fixture = TestBed.createComponent(CheckInEntryPage);
    fixture.detectChanges();
    for (const result of ['checked_in', 'already_checked_in']) {
      fixture.nativeElement.querySelector('button').click();
      fixture.componentInstance.verify();
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'POST', url: '/api/v1/spaces/12/check-in' })
        .flush({
          data: {
            result,
            message: 'Accesso consentito',
            checkedInAt: '2026-09-08T08:00:00Z',
          },
        });
      await fixture.whenStable();
      expect(
        fixture.nativeElement.querySelector('[role="status"]').textContent,
      ).toContain('Accesso consentito');
      expect(fixture.nativeElement.querySelector('button').disabled).toBe(
        false,
      );
    }
  });
  it('sostituisce il vecchio successo con il nuovo errore senza ricaricare', async () => {
    const fixture = TestBed.createComponent(CheckInEntryPage);
    fixture.detectChanges();
    fixture.componentInstance.result.set({
      result: 'checked_in',
      message: 'Accesso consentito',
      checkedInAt: '',
    });
    fixture.componentInstance.verify();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/spaces/12/check-in')
      .flush(
        { error: { message: 'Il check-in è scaduto.' } },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[role="alert"]').textContent,
    ).toContain('scaduto');
  });
  it('non invia richieste per un indirizzo non valido', () => {
    spaceId = '0';
    const fixture = TestBed.createComponent(CheckInEntryPage);
    fixture.detectChanges();
    fixture.componentInstance.verify();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    TestBed.inject(HttpTestingController).expectNone(
      '/api/v1/spaces/0/check-in',
    );
  });
});
