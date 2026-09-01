import { Component } from '@angular/core';

interface QuickFilter {
  id: string;
  label: string;
  mobileLabel?: string;
  active: boolean;
  desktopOnly?: boolean;
  mobileOnly?: boolean;
}

@Component({
  selector: 'app-quick-filters',
  templateUrl: './quick-filters.component.html',
  styleUrls: ['./quick-filters.component.scss'],
  imports: [],
})
export class QuickFiltersComponent {
  filters: QuickFilter[] = [
    {
      id: 'available-now',
      label: 'Disponibili ora',
      mobileLabel: 'Ora',
      active: true,
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
    {
      id: 'more-filters',
      label: 'Filtri',
      active: false,
      mobileOnly: true,
    },
  ];

  toggleFilter(filter: QuickFilter): void {
    filter.active = !filter.active;
  }
}
