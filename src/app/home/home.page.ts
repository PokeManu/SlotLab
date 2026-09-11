import { SPACE_PREVIEW_IMAGE } from '../models/space-image';
import { Auth } from '../auth/auth';
import { ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { TopbarComponent } from '../topbar-component/topbar-component.component';
import { CampusMapComponent } from '../campus-map/campus-map.component';
import { NextBookingComponent } from '../next-booking/next-booking.component';
import { BookingSummary } from '../models/booking-summary.model';
import { SpaceCardComponent } from '../space-card/space-card.component';
import { SpaceSummary } from '../models/space-summary.model';
import { MobileNavigationComponent } from '../mobile-navigation/mobile-navigation.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonContent,
    TopbarComponent,
    CampusMapComponent,
    NextBookingComponent,
    SpaceCardComponent,
    MobileNavigationComponent,
  ],
})
export class HomePage implements OnDestroy {
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
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
    if (this.firstEntry) { this.firstEntry = false; return; }
    this.loadHome();
  }

  private loadHome(): void {
    this.loadRecommendedSpaces();
    this.loadBookings();
  }

  private loadRecommendedSpaces(): void {
    this.recommendedRequest?.unsubscribe();
    this.recommendedRequest = this.http.get<{ data: Array<{ id: number; name: string; type: string; building: { name: string }; floor: number; capacity: number }> }>(`${environment.apiUrl}/spaces/recommended`)
      .subscribe({ next: response => {
        this.recommendedSpaces = response.data.map(space => ({
          id: String(space.id), name: space.name,
          type: space.type === 'study_room' ? 'Aula studio' : space.type === 'laboratory' ? 'Laboratorio' : 'Sala riunioni',
          building: space.building.name, floor: space.floor, seats: space.capacity, image: SPACE_PREVIEW_IMAGE,
        }));
        this.changeDetector.markForCheck();
      }, error: () => { this.recommendedSpaces = []; this.changeDetector.markForCheck(); } });
  }

  private loadBookings(): void {
    this.bookingsRequest?.unsubscribe();
    this.bookingsRequest = this.http.get<{ data: Array<{ id: number; spaceName: string; status: 'confirmed'; date: string; startTime: string; endTime: string; building: string; floor: number; participantCount: number }> }>(`${environment.apiUrl}/bookings`)
      .subscribe({ next: response => {
        const booking = response.data[0];
        this.nextBooking = booking ? { id: String(booking.id), spaceName: booking.spaceName, status: booking.status,
          dateLabel: new Date(`${booking.date}T12:00:00Z`).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' }), startTime: booking.startTime,
          endTime: booking.endTime, building: booking.building, floor: booking.floor, participants: booking.participantCount } : null;
        this.changeDetector.markForCheck();
      }, error: () => { this.nextBooking = null; this.changeDetector.markForCheck(); } });
  }

  openSpace(spaceId: string): void {
    this.router.navigate(['/spaces', spaceId], { queryParams: { from: 'home' } });
  }

  openAllSpaces(): void {
    this.router.navigate(['/spaces']);
  }

  openBooking(bookingId: string): void {
    this.router.navigate(['/bookings', bookingId]);
  }

  private formatRomeToday(date: Date): string {
    const label = new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome', weekday: 'long', day: 'numeric', month: 'long',
    }).format(date);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
}
