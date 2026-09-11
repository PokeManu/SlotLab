import { AdminSidebarComponent } from '../admin-parts/admin-sidebar.component';
import { Auth } from '../auth/auth';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { allPages } from '../api/all-pages';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
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
interface AdminBooking {
  time: string;
  name: string;
  building: string;
  details: string;
  status: string;
}
interface SpaceStatus {
  icon: string;
  name: string;
  details: string;
  tone: 'available' | 'warning';
}
@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  imports: [AdminSidebarComponent, IonContent, IonIcon, FormsModule],
})
export class AdminDashboardPage implements OnInit {
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  searchTerm = '';
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  bookings: AdminBooking[] = [];
  spaceStatuses: SpaceStatus[] = [];
  bookingCount = 0;
  spaceCount = 0;
  availableSpaceCount = 0;
  openReportCount = 0;
  readonly todayLabel = this.formatRomeToday(new Date());
  private hasEntered = false;
  ngOnInit(): void {
    this.loadSummary();
    this.loadBookings();
    this.loadSpaceStatuses();
    this.loadReportsRefresh();
  }
  ionViewWillEnter(): void {
    if (this.hasEntered) {
      this.loadSummary();
      this.loadBookings();
    }
    this.hasEntered = true;
  }
  private loadSummary(): void {
    this.http
      .get<{
        data: {
          bookingCount: number;
          spaceCount: number;
          availableSpaceCount: number;
          openReportCount: number;
        };
      }>(`${environment.apiUrl}/admin/summary`)
      .subscribe({
        next: (response) => {
          this.bookingCount = response.data.bookingCount;
          this.spaceCount = response.data.spaceCount;
          this.availableSpaceCount = response.data.availableSpaceCount;
          this.openReportCount = response.data.openReportCount;
          this.changeDetector.markForCheck();
        },
        error: () => this.changeDetector.markForCheck(),
      });
  }
  private loadBookings(): void {
    allPages<{
      date: string;
      startTime: string;
      spaceName: string;
      building: string;
      participantCount: number;
      status: string;
    }>(this.http, `${environment.apiUrl}/admin/bookings?size=5`).subscribe({
      next: (response) => {
        const current = new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'Europe/Rome',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).format(new Date());
        this.bookings = response.data
          .filter(
            (item) =>
              item.status === 'confirmed' &&
              `${item.date} ${item.startTime}` > current,
          )
          .sort((a, b) =>
            `${a.date} ${a.startTime}`.localeCompare(
              `${b.date} ${b.startTime}`,
            ),
          )
          .slice(0, 5)
          .map((item) => ({
            time: `${item.date} ${item.startTime}`,
            name: item.spaceName,
            building: item.building,
            details: `${item.participantCount} partecipanti`,
            status: 'Confermata',
          }));
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.bookings = [];
        this.changeDetector.markForCheck();
      },
    });
  }
  private loadSpaceStatuses(): void {
    this.http
      .get<{
        data: Array<{
          status: string;
          type: string;
          name: string;
        }>;
      }>(`${environment.apiUrl}/admin/spaces`)
      .subscribe({
        next: (response) => {
          this.spaceStatuses = response.data
            .slice(0, 4)
            .map((item) => ({
              icon:
                item.type === 'study_room' ? 'book-outline' : 'desktop-outline',
              name: item.name,
              details:
                item.status === 'active'
                  ? 'Disponibile'
                  : item.status === 'maintenance'
                    ? 'Manutenzione'
                    : 'Disattivato',
              tone: item.status === 'active' ? 'available' : 'warning',
            }));
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.spaceStatuses = [];
          this.changeDetector.markForCheck();
        },
      });
  }
  private loadReportsRefresh(): void {
    this.http
      .get<{
        data: Array<{
          status: string;
        }>;
      }>(`${environment.apiUrl}/admin/reports`)
      .subscribe({
        next: () => this.changeDetector.markForCheck(),
        error: () => this.changeDetector.markForCheck(),
      });
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
