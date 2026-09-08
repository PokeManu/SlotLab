import { EMPTY, Subscription, expand, reduce } from 'rxjs';
import { BookingFiltersComponent } from '../admin-parts/booking-filters.component';
import { BookingDetailComponent } from '../admin-parts/booking-detail.component';
import { BookingsSidebarComponent } from '../admin-parts/bookings-sidebar.component';
import { Auth } from '../auth/auth';
 import { CommonModule } from '@angular/common';
 import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
  import { HttpClient } from '@angular/common/http';
  import { environment } from '../../environments/environment';
  import { FormsModule } from '@angular/forms';
  import {
    IonContent,
    IonIcon,
  } from '@ionic/angular';
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
    eyeOutline,
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

  type BookingStatus = 'Confermata' | 'Completata';

  interface BookingParticipant { firstName: string; lastName: string; email: string; present: boolean; }
  interface ApiBooking {
    participants?: BookingParticipant[];
    id: number; date: string; startTime: string; endTime: string; spaceName: string;
    building: string; floor: number; participantCount: number; status: string; organizerName: string;
  }
  interface BookingResponse { data: ApiBooking[]; pagination: { page: number; totalPages: number }; }

  export interface AdminBooking {
    people?: BookingParticipant[];
    code: string;
    startTime: string;
    endTime: string;
    space: string;
    bookedBy: string;
    participants: number;
    status: BookingStatus;
    dateLabel: string;
    dateValue: string;
    building: string;
    floor: number;
  }

  @Component({
    selector: 'app-admin-bookings',
    templateUrl: './admin-bookings.page.html',
    styleUrls: ['./admin-bookings.page.scss'],
    standalone: true,
    imports: [BookingFiltersComponent, BookingDetailComponent, BookingsSidebarComponent,
      CommonModule,
      FormsModule,
      IonContent,
      IonIcon,
    ],
  })
  export class AdminBookingsPage implements OnInit, OnDestroy {
  readonly auth = inject(Auth);
    private readonly http = inject(HttpClient);
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
    openedMenuCode: string | null = null;

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
        eyeOutline,
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

    ngOnInit(): void { this.loadBookings(); }

    ionViewWillEnter(): void {
      if (this.hasEntered) this.loadBookings();
      this.hasEntered = true;
    }

    ngOnDestroy(): void { this.request?.unsubscribe(); }

    loadBookings(): void {
      this.request?.unsubscribe();
      const selectedCode = this.selectedBooking?.code;
      this.bookings = [];
      this.selectedBooking = null;
      this.openedMenuCode = null;
      this.loading = true;
      this.errorMessage = '';
      this.changeDetector.markForCheck();
      const fetchPage = (page: number) => this.http.get<BookingResponse>(`${environment.apiUrl}/admin/bookings?page=${page}&size=100`);
      this.request = fetchPage(1).pipe(
        expand(response => response.pagination.page < response.pagination.totalPages
          ? fetchPage(response.pagination.page + 1) : EMPTY),
        reduce((rows: ApiBooking[], response) => rows.concat(response.data), []),
      ).subscribe({ next: rows => {
        this.bookings = rows.map(booking => ({
          people: booking.participants ?? [], code: String(booking.id), startTime: booking.startTime, endTime: booking.endTime, space: booking.spaceName,
          bookedBy: booking.organizerName ?? '—', participants: booking.participantCount,
          status: booking.status === 'completed' ? 'Completata' : 'Confermata',
          dateLabel: new Date(`${booking.date}T12:00:00Z`).toLocaleDateString('it-IT'), dateValue: booking.date,
          building: booking.building, floor: booking.floor,
        }));
        this.selectedBooking = this.bookings.find(booking => booking.code === selectedCode) ?? null;
        this.keepSelectedBookingVisible();
        this.loading = false;
        this.changeDetector.markForCheck();
      }, error: () => {
        this.loading = false;
        this.errorMessage = 'Impossibile caricare le prenotazioni. Riprova.';
        this.changeDetector.markForCheck();
      } });
    }

    get availableDates(): string[] {
      return [...new Set(this.bookings.map(booking => booking.dateValue))].sort();
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
          this.selectedSpace.length === 0 ||
          booking.space === this.selectedSpace;

        const matchesStatus =
          this.selectedStatus.length === 0 ||
          booking.status === this.selectedStatus;

        return (
          matchesSearch &&
          matchesDate &&
          matchesSpace &&
          matchesStatus
        );
      });
    }

    get totalPages(): number {
      return Math.max(
        1,
        Math.ceil(this.filteredBookings.length / this.pageSize),
      );
    }

    get visibleBookings(): AdminBooking[] {
      const firstIndex = (this.currentPage - 1) * this.pageSize;

      return this.filteredBookings.slice(
        firstIndex,
        firstIndex + this.pageSize,
      );
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
      return Array.from(
        { length: this.totalPages },
        (_, index) => index + 1,
      );
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
      this.openedMenuCode = null;
    }

    goToPage(page: number): void {
      if (page < 1 || page > this.totalPages) {
        return;
      }

      this.currentPage = page;
      this.openedMenuCode = null;
    }

    previousPage(): void {
      this.goToPage(this.currentPage - 1);
    }

    nextPage(): void {
      this.goToPage(this.currentPage + 1);
    }

    toggleActions(
      event: MouseEvent,
      bookingCode: string,
    ): void {
      event.stopPropagation();

      this.openedMenuCode =
        this.openedMenuCode === bookingCode
          ? null
          : bookingCode;
    }

    openBookingDetails(
      event: MouseEvent,
      booking: AdminBooking,
    ): void {
      event.stopPropagation();
      this.selectBooking(booking);
    }

    statusModifier(status: BookingStatus): string {
      return status === 'Confermata' ? 'booking-status--confirmed' : 'booking-status--check-in';
    }

    private keepSelectedBookingVisible(): void {
      if (!this.selectedBooking || !this.filteredBookings.includes(this.selectedBooking)) {
        this.selectedBooking = this.filteredBookings[0] ?? null;
      }

      if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages;
      }
    }
  }
