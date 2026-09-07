import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { pricetagOutline, bookOutline, personOutline, timeOutline, businessOutline, peopleOutline, createOutline, trashOutline } from 'ionicons/icons';
import type { AdminBooking } from '../admin-bookings/admin-bookings.page';

@Component({ selector: 'app-booking-detail', imports: [IonIcon],
  templateUrl: './booking-detail.component.html', styleUrls: ['./booking-detail.component.scss'] })
export class BookingDetailComponent {
  @Input({ required: true }) selectedBooking!: AdminBooking;
  @Output() edit = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  constructor() { addIcons({ 'tag-outline': pricetagOutline, bookOutline, personOutline, timeOutline, businessOutline, peopleOutline, createOutline, trashOutline }); }
}
