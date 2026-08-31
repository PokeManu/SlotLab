import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminStatisticsPage } from './admin-statistics.page';

describe('AdminStatisticsPage', () => {
  let component: AdminStatisticsPage;
  let fixture: ComponentFixture<AdminStatisticsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminStatisticsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
