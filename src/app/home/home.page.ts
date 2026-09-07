import { Auth } from '../auth/auth';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
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
export class HomePage {
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  nextBooking: BookingSummary | null = null;

  recommendedSpaces: SpaceSummary[] = [];
  private firstEntry = true;

  ngOnInit(): void { this.loadHome(); }

  ionViewDidEnter(): void {
    if (this.firstEntry) { this.firstEntry = false; return; }
    this.loadHome();
  }

  private loadHome(): void {
    this.http.get<{ data: Array<{ id: number; name: string; type: string; building: { name: string }; floor: number; capacity: number }> }>(`${environment.apiUrl}/spaces/recommended`)
      .subscribe({ next: response => {
        this.recommendedSpaces = response.data.map(space => ({
          id: String(space.id), name: space.name,
          type: space.type === 'study_room' ? 'Aula studio' : space.type === 'laboratory' ? 'Laboratorio' : 'Sala riunioni',
          building: space.building.name, floor: space.floor, seats: space.capacity,
        }));
        this.changeDetector.markForCheck();
      }, error: () => { this.recommendedSpaces = []; this.changeDetector.markForCheck(); } });
    this.http.get<{ data: Array<{ id: number; spaceName: string; status: 'confirmed'; date: string; startTime: string; endTime: string; building: string; floor: number; participantCount: number }> }>(`${environment.apiUrl}/bookings`)
      .subscribe({ next: response => {
        const booking = response.data[0];
        this.nextBooking = booking ? { id: String(booking.id), spaceName: booking.spaceName, status: booking.status,
          dateLabel: new Date(`${booking.date}T12:00:00Z`).toLocaleDateString('it-IT'), startTime: booking.startTime,
          endTime: booking.endTime, building: booking.building, floor: booking.floor, participants: booking.participantCount } : null;
        this.changeDetector.markForCheck();
      }, error: () => { this.nextBooking = null; this.changeDetector.markForCheck(); } });
  }

  openSpace(spaceId: string): void {
    this.router.navigate(['/spaces', spaceId]);
  }

  openAllSpaces(): void {
    this.router.navigate(['/spaces']);
  }

  openBooking(bookingId: string): void {
    this.router.navigate(['/bookings'], { queryParams: { bookingId } });
  }
}
