import { Component, Input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  bookOutline,
  desktopOutline,
  peopleOutline,
  scanOutline,
} from 'ionicons/icons';

import { BookingListItem } from '../models/booking-list-item.model';

@Component({
  selector: 'app-booking-list-item',
  templateUrl: './booking-list-item.component.html',
  styleUrls: ['./booking-list-item.component.scss'],
  imports: [IonIcon],
})
export class BookingListItemComponent {
  @Input({ required: true })
  booking!: BookingListItem;

  constructor() {
    addIcons({
      bookOutline,
      desktopOutline,
      peopleOutline,
      scanOutline,
    });
  }

  get spaceIcon(): string {
    return this.booking.spaceType === 'laboratory'
      ? 'desktop-outline'
      : 'book-outline';
  }

  get statusLabel(): string {
    switch (this.booking.status) {
      case 'confirmed':
        return 'Confermata';
      case 'pending':
        return 'In attesa';
      case 'cancelled':
        return 'Annullata';
    }
  }
}
