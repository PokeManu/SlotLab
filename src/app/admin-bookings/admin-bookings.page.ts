import { Subscription } from 'rxjs';
import { BookingFiltersComponent } from '../admin-parts/booking-filters.component';
import { BookingDetailComponent } from '../admin-parts/booking-detail.component';
import { Auth } from '../auth/auth';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import {
  AdminBooking,
  AdminBookingStatus,
  AdminBookingsApi,
} from '../api/admin-bookings-api';
import { IonBadge, IonButton, IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  bookOutline,
  businessOutline,
  calendarClearOutline,
  chevronBackOutline,
  chevronDownOutline,
  chevronForwardOutline,
  createOutline,
  ellipsisVerticalOutline,
  gridOutline,
  logOutOutline,
  peopleOutline,
  personOutline,
  searchOutline,
  statsChartOutline,
  pricetagOutline,
  timeOutline,
  trashOutline,
  warningOutline,
} from 'ionicons/icons';
@Component({
  selector: 'app-admin-bookings',
  templateUrl: './admin-bookings.page.html',
  styleUrls: ['./admin-bookings.page.scss'],
  standalone: true,
  imports: [
    BookingFiltersComponent,
    BookingDetailComponent,
    CommonModule,
    IonBadge,
    IonButton,
    IonContent,
    IonIcon,
    IonSpinner,
  ],
})
export class AdminBookingsPage implements OnInit, OnDestroy {
  readonly auth = inject(Auth);
  private readonly bookingsApi = inject(AdminBookingsApi);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private request?: Subscription;
  private hasEntered = false;
  loading = false;
  errorMessage = '';
  readonly pageSize = 4;
  currentPage = 1;
  searchTerm = '';
  selectedDate = '';
  selectedSpace = '';
  selectedStatus = '';
  bookings: AdminBooking[] = [];
  selectedBooking: AdminBooking | null = null;
  constructor() {
    addIcons({
      addOutline,
      bookOutline,
      businessOutline,
      calendarClearOutline,
      chevronBackOutline,
      chevronDownOutline,
      chevronForwardOutline,
      createOutline,
      ellipsisVerticalOutline,
      gridOutline,
      logOutOutline,
      peopleOutline,
      personOutline,
      searchOutline,
      statsChartOutline,
      pricetagOutline,
      timeOutline,
      trashOutline,
      warningOutline,
    });
  }
  ngOnInit(): void {
    this.loadBookings();
  }
  ionViewWillEnter(): void {
    if (this.hasEntered) this.loadBookings();
    this.hasEntered = true;
  }
  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }
  loadBookings(): void {
    this.request?.unsubscribe();
    const selectedCode = this.selectedBooking?.code;
    this.bookings = [];
    this.selectedBooking = null;
    this.loading = true;
    this.errorMessage = '';
    this.changeDetector.markForCheck();
    this.request = this.bookingsApi.list().subscribe({
        next: (bookings) => {
          this.bookings = bookings;
          this.selectedBooking =
            this.bookings.find((booking) => booking.code === selectedCode) ??
            null;
          this.keepSelectedBookingVisible();
          this.loading = false;
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Impossibile caricare le prenotazioni. Riprova.';
          this.changeDetector.markForCheck();
        },
      });
  }
  get availableDates(): string[] {
    return [
      ...new Set(this.bookings.map((booking) => booking.dateValue)),
    ].sort();
  }
  get availableSpaces(): string[] {
    return [...new Set(this.bookings.map((booking) => booking.space))];
  }
  get filteredBookings(): AdminBooking[] {
    const normalizedSearch = this.searchTerm.trim().toLowerCase();
    return this.bookings.filter((booking) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        booking.space.toLowerCase().includes(normalizedSearch) ||
        booking.bookedBy.toLowerCase().includes(normalizedSearch) ||
        booking.code.toLowerCase().includes(normalizedSearch);
      const matchesDate =
        this.selectedDate.length === 0 ||
        booking.dateValue === this.selectedDate;
      const matchesSpace =
        this.selectedSpace.length === 0 || booking.space === this.selectedSpace;
      const matchesStatus =
        this.selectedStatus.length === 0 ||
        booking.status === this.selectedStatus;
      return matchesSearch && matchesDate && matchesSpace && matchesStatus;
    });
  }
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredBookings.length / this.pageSize));
  }
  get visibleBookings(): AdminBooking[] {
    const firstIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredBookings.slice(firstIndex, firstIndex + this.pageSize);
  }
  get firstVisibleBookingNumber(): number {
    if (this.filteredBookings.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }
  get lastVisibleBookingNumber(): number {
    return Math.min(
      this.currentPage * this.pageSize,
      this.filteredBookings.length,
    );
  }
  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }
  applyFilters(): void {
    this.currentPage = 1;
    this.keepSelectedBookingVisible();
  }
  resetFilters(): void {
    this.searchTerm = '';
    this.selectedDate = '';
    this.selectedSpace = '';
    this.selectedStatus = '';
    this.currentPage = 1;
    this.keepSelectedBookingVisible();
  }
  selectBooking(booking: AdminBooking): void {
    this.selectedBooking = booking;
  }
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
  }
  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }
  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }
  statusModifier(status: AdminBookingStatus): string {
    return status === 'Confermata'
      ? 'booking-status--confirmed'
      : 'booking-status--check-in';
  }
  private keepSelectedBookingVisible(): void {
    if (
      !this.selectedBooking ||
      !this.filteredBookings.includes(this.selectedBooking)
    ) {
      this.selectedBooking = this.filteredBookings[0] ?? null;
    }
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }
}
