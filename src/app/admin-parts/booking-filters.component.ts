import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline, chevronDownOutline } from 'ionicons/icons';

@Component({ selector: 'app-booking-filters', imports: [FormsModule, IonIcon],
  templateUrl: './booking-filters.component.html', styleUrls: ['./booking-filters.component.scss'] })
export class BookingFiltersComponent {
  @Input() searchTerm = '';
  @Input() selectedDate = '';
  @Input() selectedSpace = '';
  @Input() selectedStatus = '';
  @Input() availableDates: string[] = [];
  @Input() availableSpaces: string[] = [];
  @Output() searchTermChange = new EventEmitter<string>();
  @Output() selectedDateChange = new EventEmitter<string>();
  @Output() selectedSpaceChange = new EventEmitter<string>();
  @Output() selectedStatusChange = new EventEmitter<string>();
  @Output() changed = new EventEmitter<void>();
  constructor() { addIcons({ searchOutline, chevronDownOutline }); }
}
