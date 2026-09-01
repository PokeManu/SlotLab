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
});