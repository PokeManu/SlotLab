import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuickFiltersComponent } from './quick-filters.component';
describe('QuickFiltersComponent', () => {
  let component: QuickFiltersComponent;
  let fixture: ComponentFixture<QuickFiltersComponent>;
  beforeEach(() => {
    fixture = TestBed.createComponent(QuickFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
