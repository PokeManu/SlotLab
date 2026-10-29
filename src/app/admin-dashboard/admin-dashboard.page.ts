import { Auth } from '../auth/auth';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  AdminDashboardApi,
  DashboardBooking,
  DashboardSpaceStatus,
} from '../api/admin-dashboard-api';
import { IonButton, IonContent, IonIcon, IonSearchbar, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  barChartOutline,
  bookOutline,
  businessOutline,
  calendarClearOutline,
  calendarOutline,
  checkboxOutline,
  desktopOutline,
  gridOutline,
  printOutline,
  searchOutline,
  warningOutline,
  constructOutline,
} from 'ionicons/icons';
@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  imports: [IonButton, IonContent, IonIcon, IonSearchbar, IonSpinner],
})
export class AdminDashboardPage implements OnInit, OnDestroy {
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  searchTerm = '';
  private readonly dashboardApi = inject(AdminDashboardApi);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private requests: Subscription[] = [];
  bookings: DashboardBooking[] = [];
  spaceStatuses: DashboardSpaceStatus[] = [];
  bookingCount = 0;
  spaceCount = 0;
  availableSpaceCount = 0;
  openReportCount = 0;
  summaryLoading = false;
  summaryError = '';
  bookingsLoading = false;
  bookingsError = '';
  spacesLoading = false;
  spacesError = '';
  readonly todayLabel = this.formatRomeToday(new Date());
  private hasEntered = false;
  ngOnInit(): void {
    this.loadDashboard();
  }
  ngOnDestroy(): void {
    this.cancelRequests();
  }
  ionViewWillEnter(): void {
    if (this.hasEntered) this.loadDashboard();
    this.hasEntered = true;
  }
  private loadDashboard(): void {
    this.cancelRequests();
    this.loadSummary();
    this.loadBookings();
    this.loadSpaceStatuses();
    this.loadReportsRefresh();
  }
  private cancelRequests(): void {
    this.requests.forEach((request) => request.unsubscribe());
    this.requests = [];
  }
  private loadSummary(): void {
    this.summaryLoading = true;
    this.summaryError = '';
    this.requests.push(
      this.dashboardApi.summary().subscribe({
        next: (summary) => {
          this.bookingCount = summary.bookingCount;
          this.spaceCount = summary.spaceCount;
          this.availableSpaceCount = summary.availableSpaceCount;
          this.openReportCount = summary.openReportCount;
          this.summaryLoading = false;
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.summaryLoading = false;
          this.summaryError = 'Impossibile caricare il riepilogo.';
          this.changeDetector.markForCheck();
        },
      }),
    );
  }
  private loadBookings(): void {
    this.bookingsLoading = true;
    this.bookingsError = '';
    this.bookings = [];
    this.requests.push(this.dashboardApi.upcomingBookings().subscribe({
      next: (bookings) => {
        this.bookings = bookings;
        this.bookingsLoading = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.bookings = [];
        this.bookingsLoading = false;
        this.bookingsError = 'Impossibile caricare le prenotazioni.';
        this.changeDetector.markForCheck();
      },
    }));
  }
  private loadSpaceStatuses(): void {
    this.spacesLoading = true;
    this.spacesError = '';
    this.spaceStatuses = [];
    this.requests.push(
      this.dashboardApi.spaceStatuses().subscribe({
        next: (statuses) => {
          this.spaceStatuses = statuses;
          this.spacesLoading = false;
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.spaceStatuses = [];
          this.spacesLoading = false;
          this.spacesError = 'Impossibile caricare lo stato degli spazi.';
          this.changeDetector.markForCheck();
        },
      }),
    );
  }
  private loadReportsRefresh(): void {
    this.requests.push(
      this.dashboardApi.refreshReports().subscribe({
        next: () => this.changeDetector.markForCheck(),
        error: () => this.changeDetector.markForCheck(),
      }),
    );
  }
  retrySummary(): void {
    this.loadSummary();
  }
  retryBookings(): void {
    this.loadBookings();
  }
  retrySpaces(): void {
    this.loadSpaceStatuses();
  }
  openBookings(): void {
    this.router.navigate(['/admin/bookings']);
  }
  openSpaces(): void {
    this.router.navigate(['/admin/spaces']);
  }
  searchAdmin(): void {
    const value = this.searchTerm.trim();
    this.router.navigate(['/admin/spaces'], {
      queryParams: value ? { search: value } : {},
    });
  }
  onSearchInput(value: string | null | undefined): void {
    this.searchTerm = value ?? '';
  }
  private formatRomeToday(date: Date): string {
    const label = new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  constructor() {
    addIcons({
      barChartOutline,
      bookOutline,
      businessOutline,
      calendarClearOutline,
      calendarOutline,
      checkboxOutline,
      desktopOutline,
      gridOutline,
      printOutline,
      searchOutline,
      warningOutline,
      constructOutline,
    });
  }
}
