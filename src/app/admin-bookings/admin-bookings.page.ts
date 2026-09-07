import { BookingFiltersComponent } from '../admin-parts/booking-filters.component';
import { BookingDetailComponent } from '../admin-parts/booking-detail.component';
import { BookingsSidebarComponent } from '../admin-parts/bookings-sidebar.component';
import { Auth } from '../auth/auth';
 import { CommonModule } from '@angular/common';
  import { Component, inject } from '@angular/core';
  import { FormsModule } from '@angular/forms';
  import { Router } from '@angular/router';
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

  type BookingStatus = 'Confermata' | 'Check-in' | 'Annullata';

  export interface AdminBooking {
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
  export class AdminBookingsPage {
  readonly auth = inject(Auth);
    readonly pageSize = 4;

    currentPage = 1;
    searchTerm = '';
    selectedDate = '';
    selectedSpace = '';
    selectedStatus = '';
    openedMenuCode: string | null = null;

    readonly bookings: AdminBooking[] = [
      {
        code: 'SL-4821',
        startTime: '09:00',
        endTime: '10:00',
        space: 'Aula Studio A3',
        bookedBy: 'Mario Rossi',
        participants: 4,
        status: 'Confermata',
        dateLabel: 'Oggi',
        dateValue: '2026-08-31',
        building: 'Edificio 6',
        floor: 2,
      },
      {
        code: 'SL-4822',
        startTime: '10:30',
        endTime: '12:30',
        space: 'Laboratorio Web',
        bookedBy: 'Giulia Bianchi',
        participants: 18,
        status: 'Check-in',
        dateLabel: 'Oggi',
        dateValue: '2026-08-31',
        building: 'Edificio 9',
        floor: 1,
      },
      {
        code: 'SL-4823',
        startTime: '12:00',
        endTime: '13:00',
        space: 'Sala Riunioni B',
        bookedBy: 'Luca Romano',
        participants: 8,
        status: 'Confermata',
        dateLabel: 'Oggi',
        dateValue: '2026-08-31',
        building: 'Edificio 6',
        floor: 1,
      },
      {
        code: 'SL-4824',
        startTime: '14:30',
        endTime: '16:30',
        space: 'Postazione 3D-02',
        bookedBy: 'Anna Verdi',
        participants: 1,
        status: 'Annullata',
        dateLabel: 'Oggi',
        dateValue: '2026-08-31',
        building: 'Edificio 4',
        floor: 2,
      },
      {
        code: 'SL-4825',
        startTime: '08:30',
        endTime: '10:30',
        space: 'Aula Studio A1',
        bookedBy: 'Paolo Conti',
        participants: 6,
        status: 'Confermata',
        dateLabel: 'Domani',
        dateValue: '2026-09-01',
        building: 'Edificio 6',
        floor: 2,
      },
      {
        code: 'SL-4826',
        startTime: '11:00',
        endTime: '12:00',
        space: 'Laboratorio Reti',
        bookedBy: 'Elena Ferri',
        participants: 12,
        status: 'Confermata',
        dateLabel: 'Domani',
        dateValue: '2026-09-01',
        building: 'Edificio 9',
        floor: 1,
      },
      {
        code: 'SL-4827',
        startTime: '13:30',
        endTime: '15:00',
        space: 'Sala Riunioni B',
        bookedBy: 'Marco Gallo',
        participants: 5,
        status: 'Annullata',
        dateLabel: 'Domani',
        dateValue: '2026-09-01',
        building: 'Edificio 6',
        floor: 1,
      },
      {
        code: 'SL-4828',
        startTime: '15:30',
        endTime: '17:30',
        space: 'Laboratorio Web',
        bookedBy: 'Sara Leone',
        participants: 16,
        status: 'Check-in',
        dateLabel: 'Domani',
        dateValue: '2026-09-01',
        building: 'Edificio 9',
        floor: 1,
      },
    ];

    selectedBooking: AdminBooking = this.bookings[0];

    constructor(private readonly router: Router) {
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

    createBooking(): void {
      void this.router.navigate(['/admin/bookings/new']);
    }

    editSelectedBooking(): void {
      void this.router.navigate([
        '/admin/bookings',
        this.selectedBooking.code,
        'edit',
      ]);
    }

    editBooking(
      event: MouseEvent,
      booking: AdminBooking,
    ): void {
      event.stopPropagation();
      this.selectedBooking = booking;
      this.openedMenuCode = null;
      this.editSelectedBooking();
    }

    cancelSelectedBooking(): void {
      this.updateBookingStatus(
        this.selectedBooking,
        'Annullata',
      );
    }

    cancelBooking(
      event: MouseEvent,
      booking: AdminBooking,
    ): void {
      event.stopPropagation();
      this.updateBookingStatus(booking, 'Annullata');
      this.openedMenuCode = null;
    }

    statusModifier(status: BookingStatus): string {
      switch (status) {
        case 'Confermata':
          return 'booking-status--confirmed';
        case 'Check-in':
          return 'booking-status--check-in';
        case 'Annullata':
          return 'booking-status--cancelled';
      }
    }

    private updateBookingStatus(
      booking: AdminBooking,
      status: BookingStatus,
    ): void {
      booking.status = status;
      this.selectedBooking = booking;
    }

    private keepSelectedBookingVisible(): void {
      const firstFilteredBooking = this.filteredBookings[0];

      if (
        firstFilteredBooking &&
        !this.filteredBookings.includes(this.selectedBooking)
      ) {
        this.selectedBooking = firstFilteredBooking;
      }

      if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages;
      }
    }
  }
