import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { ReportsPage } from './reports.page';

describe('ReportsPage', () => {
  let component: ReportsPage;
  let fixture: ComponentFixture<ReportsPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ReportsPage,
      ],
      providers: [
        provideRouter([]),
        provideHttpClient(), provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/reports').flush({ data: [] });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('mostra la segnalazione ricevuta dal server', async () => {
    component.ngOnInit();
    http.expectOne('/api/v1/reports').flush({ data: [{ id: 4, spaceId: 1, spaceName: 'Aula A1', category: 'technical', description: 'Presa guasta', createdAt: '2026-09-07T10:00:00.000Z', status: 'open' }] });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Presa guasta');
  });

  it('ricarica le segnalazioni tornando nella pagina', () => {
    component.ionViewDidEnter();
    http.expectOne('/api/v1/reports').flush({ data: [{ id: 5, spaceId: 2, spaceName: 'Sala B', category: 'cleaning', description: 'Pulizia necessaria', createdAt: '2026-09-07T10:00:00.000Z', status: 'open' }] });
    expect(component.reports.map(report => report.id)).toEqual(['5']);
  });
});
