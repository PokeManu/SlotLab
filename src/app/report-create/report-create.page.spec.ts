import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ReportCreatePage } from './report-create.page';

describe('ReportCreatePage', () => {
  let component: ReportCreatePage;
  let fixture: ComponentFixture<ReportCreatePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ReportCreatePage,
      ],
      providers: [
        provideRouter([]),
        provideHttpClient(), provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportCreatePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should submit a valid report', () => {
    component.category = 'equipment';
    component.description =
      'Una presa elettrica non funziona correttamente.';

    component.submitReport();

    expect(component.submitted).toBe(true);
  });
});
