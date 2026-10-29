import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonSearchbar,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular';
@Component({
  selector: 'app-booking-filters',
  imports: [DatePipe, IonSearchbar, IonSelect, IonSelectOption],
  templateUrl: './booking-filters.component.html',
  styleUrls: ['./booking-filters.component.scss'],
})
export class BookingFiltersComponent {
  @Input()
  searchTerm = '';
  @Input()
  selectedDate = '';
  @Input()
  selectedSpace = '';
  @Input()
  selectedStatus = '';
  @Input()
  availableDates: string[] = [];
  @Input()
  availableSpaces: string[] = [];
  @Output()
  searchTermChange = new EventEmitter<string>();
  @Output()
  selectedDateChange = new EventEmitter<string>();
  @Output()
  selectedSpaceChange = new EventEmitter<string>();
  @Output()
  selectedStatusChange = new EventEmitter<string>();
  @Output()
  changed = new EventEmitter<void>();
}
