import { Component } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  chevronDownOutline,
} from 'ionicons/icons';

import { BookingListItemComponent } from '../booking-list-item/booking-list-item.component';
import { UPCOMING_BOOKING_GROUPS } from '../data/bookings.data';
import { MobileNavigationComponent } from '../mobile-navigation/mobile-navigation.component';
import { TopbarComponent } from '../topbar-component/topbar-component.component';

type BookingView =
  | 'upcoming'
  | 'past';

@Component({
  selector: 'app-bookings',
  templateUrl: './bookings.page.html',
  styleUrls: ['./bookings.page.scss'],
  imports: [
    IonContent,
    IonIcon,
    TopbarComponent,
    BookingListItemComponent,
    MobileNavigationComponent,
  ],
})
export class BookingsPage {
  readonly upcomingBookingGroups = UPCOMING_BOOKING_GROUPS;

  selectedView: BookingView = 'upcoming';

  constructor() {
    addIcons({
      calendarOutline,
      chevronDownOutline,
    });
  }

  selectView(view: BookingView): void {
    this.selectedView = view;
  }
}
