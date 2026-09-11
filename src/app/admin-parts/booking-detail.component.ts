import { Component, Input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  pricetagOutline,
  bookOutline,
  personOutline,
  timeOutline,
  businessOutline,
  peopleOutline,
  createOutline,
  trashOutline,
} from 'ionicons/icons';
import type { AdminBooking } from '../admin-bookings/admin-bookings.page';
@Component({
  selector: 'app-booking-detail',
  imports: [IonIcon],
  templateUrl: './booking-detail.component.html',
  styleUrls: ['./booking-detail.component.scss'],
})
export class BookingDetailComponent {
  @Input({ required: true })
  selectedBooking!: AdminBooking;
  constructor() {
    addIcons({
      'tag-outline': pricetagOutline,
      bookOutline,
      personOutline,
      timeOutline,
      businessOutline,
      peopleOutline,
      createOutline,
      trashOutline,
    });
  }
  checkInLabel(person: NonNullable<AdminBooking['people']>[number]): string {
    if (!person.present || !person.checkedInAt)
      return 'Check-in non registrato';
    const instant = new Date(person.checkedInAt);
    if (Number.isNaN(instant.getTime())) return 'Check-in registrato';
    return `Check-in registrato: ${new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome',
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(instant)}`;
  }
}
