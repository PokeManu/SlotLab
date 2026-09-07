import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { IonContent, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  chevronDownOutline,
} from 'ionicons/icons';

import { BookingListItemComponent } from '../booking-list-item/booking-list-item.component';
import { BookingGroup, BookingListItem } from '../models/booking-list-item.model';
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
export class BookingsPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  upcomingBookingGroups: BookingGroup[] = [];
  cancelError = '';
  selectedMonth = this.currentMonthValue();
  private allBookings: BookingListItem[] = [];
  @ViewChild('monthPicker') private monthPicker?: ElementRef<HTMLInputElement>;
  private hasEntered = false;

  selectedView: BookingView = 'upcoming';

  constructor(private readonly router: Router) {
    addIcons({
      calendarOutline,
      chevronDownOutline,
    });
  }

  ngOnInit(): void {
    this.loadBookings();
  }

  ionViewDidEnter(): void {
    if (this.hasEntered) this.loadBookings();
    this.hasEntered = true;
  }

  private loadBookings(): void {
    this.http.get<{ data: Array<{ id: number; spaceId: number; spaceName: string; building: string; floor: number; date: string; startTime: string; endTime: string; status: 'confirmed'; participantCount: number }> }>(`${environment.apiUrl}/bookings`)
      .subscribe({ next: response => {
        this.allBookings = response.data.map(booking => ({
          id: String(booking.id), spaceId: String(booking.spaceId), spaceName: booking.spaceName, status: booking.status,
          dateLabel: new Date(`${booking.date}T12:00:00Z`).toLocaleDateString('it-IT'), dateValue: booking.date,
          startTime: booking.startTime, endTime: booking.endTime, building: booking.building,
          floor: booking.floor, participants: booking.participantCount, spaceType: 'study-room', canCheckIn: this.isCheckInWindow(booking.date, booking.startTime),
        }));
        this.rebuildGroups();
        this.changeDetector.markForCheck();
      }, error: () => { this.upcomingBookingGroups = []; this.changeDetector.markForCheck(); } });
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

  openMonthPicker(): void {
    const picker = this.monthPicker?.nativeElement;
    if (!picker) return;
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
  }

  get selectedMonthLabel(): string {
    const label = new Date(`${this.selectedMonth}-01T12:00:00Z`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  private currentMonthValue(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private isCheckInWindow(date: string, startTime: string): boolean {
    const start = new Date(`${date}T${startTime}:00`);
    if (Number.isNaN(start.getTime())) return false;
    const now = Date.now();
    return now >= start.getTime() - 15 * 60 * 1000 && now <= start.getTime() + 30 * 60 * 1000;
  }

  private rebuildGroups(): void {
    const groups = new Map<string, BookingListItem[]>();
    for (const booking of this.allBookings.filter(item => item.dateValue?.startsWith(this.selectedMonth))) {
      (groups.get(booking.dateLabel) ?? (groups.set(booking.dateLabel, []).get(booking.dateLabel)!)).push(booking);
    }
    this.upcomingBookingGroups = [...groups].map(([dateLabel, bookings]) => ({ dateLabel, bookings }));
    this.changeDetector.markForCheck();
  }

  openCheckIn(spaceId: string): void {
    void this.router.navigate(['/check-in', spaceId]);
  }

  cancelBooking(bookingId: string): void {
    if (!/^[1-9][0-9]*$/.test(bookingId)) return;
    this.cancelError = '';
    this.http.delete<void>(`${environment.apiUrl}/bookings/${bookingId}`).subscribe({
      next: () => {
        this.allBookings = this.allBookings.filter(booking => booking.id !== bookingId);
        this.rebuildGroups();
      },
      error: (error: HttpErrorResponse) => {
        this.cancelError = typeof error.error?.error?.message === 'string'
          ? error.error.error.message
          : 'Non è stato possibile annullare la prenotazione.';
        this.changeDetector.markForCheck();
      },
    });
  }
}
