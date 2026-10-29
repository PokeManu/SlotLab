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

  it('emits the active filters when an Ionic button is toggled', () => {
    const values: string[][] = [];
    component.filtersChange.subscribe((filters) => values.push(filters));
    const button: HTMLIonButtonElement = fixture.nativeElement.querySelector('ion-button');

    button.click();
    fixture.detectChanges();

    expect(values).toEqual([['available-now']]);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.fill).toBe('solid');

    button.click();
    fixture.detectChanges();

    expect(values[1]).toEqual([]);
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });
});
