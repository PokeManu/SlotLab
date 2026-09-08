import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';

import { SPACE_REPORTS } from '../data/space-reports.data';

import { ReportListItemComponent } from './report-list-item.component';

describe('ReportListItemComponent', () => {
  let component: ReportListItemComponent;
  let fixture: ComponentFixture<ReportListItemComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    fixture = TestBed.createComponent(
      ReportListItemComponent
    );

    component = fixture.componentInstance;

    fixture.componentRef.setInput(
      'report',
      SPACE_REPORTS[0]
    );

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('carica la foto privata e la mostra nella card', async () => {
    vi.stubGlobal('URL', class extends URL {
      static override createObjectURL = vi.fn(() => 'blob:user-photo');
      static override revokeObjectURL = vi.fn();
    });
    fixture.componentRef.setInput('report', { ...SPACE_REPORTS[0], id: '7', photo: 'photo.png' });
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/reports/7/photo').flush(new Blob(['photo'], { type: 'image/png' }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('img')?.getAttribute('src')).toBe('blob:user-photo');
    fixture.componentRef.setInput('report', { ...SPACE_REPORTS[0], photo: null });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:user-photo');
    http.verify();
  });

});