import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { TopbarComponent } from '../topbar-component/topbar-component.component';
import { SpaceSearchComponent } from '../space-search/space-search.component';
import { QuickFiltersComponent } from '../quick-filters/quick-filters.component';
import { CampusMapComponent } from '../campus-map/campus-map.component';
import { NextBookingComponent } from '../next-booking/next-booking.component';
import { BookingSummary } from '../models/booking-summary.model';
import { SpaceCardComponent } from '../space-card/space-card.component';
import { RECOMMENDED_SPACES } from '../data/recommended-spaces.data';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonContent,
    TopbarComponent,
    SpaceSearchComponent,
    QuickFiltersComponent,
    CampusMapComponent,
    NextBookingComponent,
    SpaceCardComponent,
  ],
})
export class HomePage {
  private readonly router = inject(Router);
  readonly nextBooking: BookingSummary = {
    id: 'booking-001',
    spaceName: 'Aula Studio A1',
    status: 'confirmed',
    dateLabel: 'Oggi',
    startTime: '10:00',
    endTime: '12:00',
    building: 'Edificio 6',
    floor: 2,
    participants: 4,
  };

  readonly recommendedSpaces = RECOMMENDED_SPACES;

  openSpace(spaceId: string): void {
    this.router.navigate(['/spaces', spaceId]);
  }
}
