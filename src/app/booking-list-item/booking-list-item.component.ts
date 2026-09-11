import { RouterLink } from '@angular/router';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { bookOutline, desktopOutline, peopleOutline } from 'ionicons/icons';
import { BookingListItem } from '../models/booking-list-item.model';
@Component({
  selector: 'app-booking-list-item',
  templateUrl: './booking-list-item.component.html',
  styleUrls: ['./booking-list-item.component.scss'],
  imports: [IonIcon, RouterLink],
})
export class BookingListItemComponent {
  @Input({ required: true })
  booking!: BookingListItem;
  @Output()
  cancelBookingRequested = new EventEmitter<string>();
  constructor() {
    addIcons({
      bookOutline,
      desktopOutline,
      peopleOutline,
    });
  }
  get spaceIcon(): string {
    return this.booking.spaceType === 'laboratory'
      ? 'desktop-outline'
      : 'book-outline';
  }
  cancelBooking(): void {
    this.cancelBookingRequested.emit(this.booking.id);
  }
  get statusLabel(): string {
    switch (this.booking.status) {
      case 'confirmed':
        return 'Confermata';
      case 'cancelled':
        return 'Annullata';
    }
  }
}
