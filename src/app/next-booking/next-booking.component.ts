import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';

import { IonIcon } from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  locationOutline,
  peopleOutline,
  timeOutline
} from 'ionicons/icons';

import { BookingSummary } from '../models/booking-summary.model';


@Component({
  selector: 'app-next-booking',
  templateUrl: './next-booking.component.html',
  styleUrls: ['./next-booking.component.scss'],
  imports: [IonIcon],
})

export class NextBookingComponent {

  constructor() {
    addIcons({
      locationOutline,
      peopleOutline,
      timeOutline,
    });
  }

  @Input({ required: true })
  booking!: BookingSummary;

  @Output()
  bookingOpened = new EventEmitter<string>();

  get statusLabel(): string {
    switch (this.booking.status) {
      case 'confirmed':
        return 'Prenotazione confermata';
      
      case 'cancelled':
        return 'Prenotazione annullata';
      
      default:
        return 'Stato non disponibile';

    }

  }

  openBooking(): void {

    this.bookingOpened.emit(this.booking.id);

  }

}
