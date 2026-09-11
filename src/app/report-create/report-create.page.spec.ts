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
  it('should submit a valid report', () => {
    component.category = 'equipment';
    component.description = 'Una presa elettrica non funziona correttamente.';
    component.submitReport();
    const request = http.expectOne('/api/v1/spaces/1/reports');
    expect(request.request.method).toBe('POST');
    request.flush({ data: { id: 1 } });
    expect(component.submitted).toBe(true);
  });
});
