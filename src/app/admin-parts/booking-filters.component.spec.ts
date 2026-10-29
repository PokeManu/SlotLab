import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingFiltersComponent } from './booking-filters.component';

describe('BookingFiltersComponent', () => {
  let component: BookingFiltersComponent;
  let fixture: ComponentFixture<BookingFiltersComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BookingFiltersComponent);
    component = fixture.componentInstance;
    component.availableDates = ['2026-10-10'];
    component.availableSpaces = ['Aula reale'];
    fixture.detectChanges();
  });

  it('usa i controlli Ionic per ricerca e filtri', () => {
    expect(fixture.nativeElement.querySelector('ion-searchbar')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('ion-select')).toHaveLength(3);
    expect(
      fixture.nativeElement.querySelectorAll('ion-select-option'),
    ).toHaveLength(7);
    expect(fixture.nativeElement.textContent).toContain('10/10/2026');
  });

  it('mantiene gli output esistenti e segnala ogni modifica', () => {
    const searchValues: string[] = [];
    const dates: string[] = [];
    let changes = 0;
    component.searchTermChange.subscribe((value) => searchValues.push(value));
    component.selectedDateChange.subscribe((value) => dates.push(value));
    component.changed.subscribe(() => changes++);

    const searchbar = fixture.nativeElement.querySelector('ion-searchbar');
    searchbar.dispatchEvent(
      new CustomEvent('ionInput', { detail: { value: 'Aula' } }),
    );
    searchbar.dispatchEvent(
      new CustomEvent('ionInput', { detail: { value: null } }),
    );
    const dateSelect = fixture.nativeElement.querySelector('ion-select');
    dateSelect.dispatchEvent(
      new CustomEvent('ionChange', { detail: { value: '2026-10-10' } }),
    );

    expect(searchValues).toEqual(['Aula', '']);
    expect(dates).toEqual(['2026-10-10']);
    expect(changes).toBe(3);
  });
});
