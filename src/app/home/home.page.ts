import { Auth } from '../auth/auth';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular';
import { CampusMapComponent } from '../campus-map/campus-map.component';
import { NextBookingComponent } from '../next-booking/next-booking.component';
import { BookingSummary } from '../models/booking-summary.model';
import { SpaceCardComponent } from '../space-card/space-card.component';
import { SpaceSummary } from '../models/space-summary.model';
import { Subscription } from 'rxjs';
import { SpacesApi } from '../api/spaces-api';
import { BookingsApi } from '../api/bookings-api';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonContent,
    IonButton,
    CampusMapComponent,
    NextBookingComponent,
    SpaceCardComponent,
  ],
})
export class HomePage implements OnInit, OnDestroy {
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly bookingsApi = inject(BookingsApi);
  private readonly spacesApi = inject(SpacesApi);
  private readonly changeDetector = inject(ChangeDetectorRef);
  nextBooking: BookingSummary | null = null;
  readonly todayLabel = this.formatRomeToday(new Date());
  recommendedSpaces: SpaceSummary[] = [];
  private firstEntry = true;
  private recommendedRequest?: Subscription;
  private bookingsRequest?: Subscription;
  private readonly onWindowFocus = () => this.loadBookings();
  private readonly onVisibilityChange = () => {
    if (document.visibilityState === 'visible') this.loadBookings();
  };
  ngOnInit(): void {
    this.loadHome();
    window.addEventListener('focus', this.onWindowFocus);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }
  ngOnDestroy(): void {
    window.removeEventListener('focus', this.onWindowFocus);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.recommendedRequest?.unsubscribe();
    this.bookingsRequest?.unsubscribe();
  }
  ionViewDidEnter(): void {
    if (this.firstEntry) {
      this.firstEntry = false;
      return;
    }
    this.loadHome();
  }
  private loadHome(): void {
    this.loadRecommendedSpaces();
    this.loadBookings();
  }
  private loadRecommendedSpaces(): void {
    this.recommendedRequest?.unsubscribe();
    this.recommendedRequest = this.spacesApi.recommended().subscribe({
      next: (spaces) => {
        this.recommendedSpaces = spaces;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.recommendedSpaces = [];
        this.changeDetector.markForCheck();
      },
    });
  }
  private loadBookings(): void {
    this.bookingsRequest?.unsubscribe();
    this.bookingsRequest = this.bookingsApi.list().subscribe({
      next: (bookings) => {
        const booking = bookings[0];
        this.nextBooking = booking
          ? {
              id: booking.id,
              spaceName: booking.spaceName,
              status: booking.status,
              dateLabel: booking.dateLabel,
              startTime: booking.startTime,
              endTime: booking.endTime,
              building: booking.building,
              floor: booking.floor,
              participants: booking.participants,
            }
          : null;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.nextBooking = null;
        this.changeDetector.markForCheck();
      },
    });
  }
  openSpace(spaceId: string): void {
    this.router.navigate(['/spaces', spaceId], {
      queryParams: { from: 'home' },
    });
  }
  openAllSpaces(): void {
    this.router.navigate(['/spaces']);
  }
  openBooking(bookingId: string): void {
    this.router.navigate(['/bookings', bookingId]);
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
}
