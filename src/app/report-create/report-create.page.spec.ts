import { ComponentFixture, TestBed } from '@angular/core/testing';
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
import { ReportCreatePage } from './report-create.page';
describe('ReportCreatePage', () => {
  let component: ReportCreatePage;
  let fixture: ComponentFixture<ReportCreatePage>;
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportCreatePage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ spaceId: '1' }) },
          },
        },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ReportCreatePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/v1/spaces/1')
      .flush({
        data: {
          id: 1,
          name: 'Aula',
          building: { name: 'Edificio' },
          floor: 1,
          type: 'study_room',
          capacity: 10,
          accessible: true,
          services: [],
        },
      });
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('carica lo spazio usando il mapping condiviso di SpacesApi', () => {
    expect(component.space).toMatchObject({
      id: '1',
      name: 'Aula',
      type: 'Aula studio',
      building: 'Edificio',
      floor: 1,
      seats: 10,
      accessible: true,
      services: [],
    });
    // The report form does not display a preview image.
    expect(component.space.image).toBe('');
  });
  it('should submit a valid report', () => {
    component.category = 'equipment';
    component.description = 'Una presa elettrica non funziona correttamente.';
    component.photo = new File(['foto'], 'problema.png', { type: 'image/png' });
    component.submitReport();
    const request = http.expectOne('/api/v1/spaces/1/reports');
    expect(request.request.method).toBe('POST');
    const body = request.request.body as FormData;
    expect(body.get('category')).toBe('technical');
    expect(body.get('description')).toBe(
      'Una presa elettrica non funziona correttamente.',
    );
    expect((body.get('photo') as File).name).toBe('problema.png');
    component.submitReport();
    http.expectNone('/api/v1/spaces/1/reports');
    request.flush({ data: { id: 1 } });
    expect(component.submitted).toBe(true);
  });
  it('mostra gli errori dopo un invio incompleto senza effettuare richieste', async () => {
    component.submitReport();
    await fixture.whenStable();
    http.expectNone('/api/v1/spaces/1/reports');
    expect(component.attemptedSubmit).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'Seleziona una tipologia di problema',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'almeno 10 caratteri',
    );
    expect(fixture.nativeElement.querySelector('ion-select')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('ion-textarea')).not.toBeNull();
  });
});
