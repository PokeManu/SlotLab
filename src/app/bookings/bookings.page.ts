import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BookingsApi } from '../api/bookings-api';
import {
  IonContent,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular';
import { romeDate } from '../models/rome-date';
import { addIcons } from 'ionicons';
import { calendarOutline, chevronDownOutline } from 'ionicons/icons';
import { BookingListItemComponent } from '../booking-list-item/booking-list-item.component';
import { Subscription } from 'rxjs';
import {
  BookingGroup,
  BookingListItem,
} from '../models/booking-list-item.model';
type BookingView = 'upcoming' | 'past';
@Component({
  selector: 'app-bookings',
  templateUrl: './bookings.page.html',
  styleUrls: ['./bookings.page.scss'],
  imports: [
    IonContent,
    IonIcon,
    IonLabel,
    IonSegment,
    IonSegmentButton,
    BookingListItemComponent,
  ],
})
export class BookingsPage implements OnInit, OnDestroy {
  private readonly bookingsApi = inject(BookingsApi);
  private readonly changeDetector = inject(ChangeDetectorRef);
  upcomingBookingGroups: BookingGroup[] = [];
  cancelError = '';
  selectedMonth = this.currentMonthValue();
  private allBookings: BookingListItem[] = [];
  private bookingsRequest?: Subscription;
  private hasEntered = false;
  selectedView: BookingView = 'upcoming';
  constructor() {
    addIcons({
      calendarOutline,
      chevronDownOutline,
    });
  }
  ngOnInit(): void {
    this.loadBookings();
  }
  ngOnDestroy(): void {
    this.bookingsRequest?.unsubscribe();
  }
  ionViewDidEnter(): void {
    if (this.hasEntered) this.loadBookings();
    this.hasEntered = true;
  }
  private loadBookings(): void {
    this.bookingsRequest?.unsubscribe();
    this.bookingsRequest = this.bookingsApi.list().subscribe({
      next: (bookings) => {
        this.allBookings = bookings;
        this.rebuildGroups();
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.allBookings = [];
        this.upcomingBookingGroups = [];
        this.changeDetector.markForCheck();
      },
    });
  }
  selectView(view: BookingView): void {
    this.selectedView = view;
  }
  selectMonth(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!/^\d{4}-\d{2}$/.test(value)) return;
    this.selectedMonth = value;
    this.rebuildGroups();
  }
  get selectedMonthLabel(): string {
    const label = new Date(
      `${this.selectedMonth}-01T12:00:00Z`,
    ).toLocaleDateString('it-IT', {
      timeZone: 'Europe/Rome',
      month: 'long',
      year: 'numeric',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  private currentMonthValue(): string {
    return romeDate().slice(0, 7);
  }
  private rebuildGroups(): void {
    const groups = new Map<string, BookingListItem[]>();
    for (const booking of this.allBookings.filter((item) =>
      item.dateValue?.startsWith(this.selectedMonth),
    )) {
      (
        groups.get(booking.dateLabel) ??
        groups.set(booking.dateLabel, []).get(booking.dateLabel)!
      ).push(booking);
    }
    this.upcomingBookingGroups = [...groups].map(([dateLabel, bookings]) => ({
      dateLabel,
      bookings,
    }));
    this.changeDetector.markForCheck();
  }
  cancelBooking(bookingId: string): void {
    if (!/^[1-9][0-9]*$/.test(bookingId)) return;
    this.cancelError = '';
    this.bookingsApi
      .cancel(bookingId)
      .subscribe({
        next: () => {
          this.allBookings = this.allBookings.filter(
            (booking) => booking.id !== bookingId,
          );
          this.rebuildGroups();
        },
        error: (error: HttpErrorResponse) => {
          this.cancelError =
            typeof error.error?.error?.message === 'string'
              ? error.error.error.message
              : 'Non è stato possibile annullare la prenotazione.';
          this.changeDetector.markForCheck();
        },
      });
  }
}
