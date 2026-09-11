import { Component, EventEmitter, Output } from '@angular/core';
interface QuickFilter {
  id: string;
  label: string;
  mobileLabel?: string;
  active: boolean;
  desktopOnly?: boolean;
}
@Component({
  selector: 'app-quick-filters',
  templateUrl: './quick-filters.component.html',
  styleUrls: ['./quick-filters.component.scss'],
  imports: [],
})
export class QuickFiltersComponent {
  @Output()
  filtersChange = new EventEmitter<string[]>();
  filters: QuickFilter[] = [
    {
      id: 'available-now',
      label: 'Disponibili ora',
      mobileLabel: 'Ora',
      active: false,
    },
    {
      id: 'study-rooms',
      label: 'Aule studio',
      active: false,
    },
    {
      id: 'accessible',
      label: 'Accessibili',
      mobileLabel: 'Accessibile',
      active: false,
    },
    {
      id: 'minimum-seats',
      label: 'Posti ≥ 10',
      active: false,
      desktopOnly: true,
    },
  ];
  toggleFilter(filter: QuickFilter): void {
    filter.active = !filter.active;
    this.filtersChange.emit(
      this.filters.filter((item) => item.active).map((item) => item.id),
    );
  }
}
