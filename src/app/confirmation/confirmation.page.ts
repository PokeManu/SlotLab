import {
  ChangeDetectorRef,
  Component,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  bookOutline,
  checkmarkOutline,
  locationOutline,
  peopleOutline,
  timeOutline,
} from 'ionicons/icons';
import { BookingDetail, BookingsApi } from '../api/bookings-api';
@Component({
  selector: 'app-confirmation',
  templateUrl: './confirmation.page.html',
  styleUrls: ['./confirmation.page.scss'],
  imports: [IonButton, IonCard, IonCardContent, IonContent, IonIcon, IonSpinner, RouterLink],
})
export class ConfirmationPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingsApi = inject(BookingsApi);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private request?: Subscription;
  private hasEntered = false;
  booking: BookingDetail | null = null;
  loading = false;
  error = '';
  constructor() {
    addIcons({
      bookOutline,
      checkmarkOutline,
      locationOutline,
      peopleOutline,
      timeOutline,
    });
  }
  ngOnInit(): void {
    this.load();
  }
  ionViewWillEnter(): void {
    if (this.hasEntered) this.load();
    this.hasEntered = true;
  }
  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }
  load(): void {
    this.request?.unsubscribe();
    this.booking = null;
    const id = this.route.snapshot.queryParamMap.get('bookingId');
    this.error = '';
    if (!id || !/^[1-9]\d*$/.test(id)) {
      this.error = 'Prenotazione non specificata.';
      return;
    }
    this.loading = true;
    this.request = this.bookingsApi
      .detail(id)
      .subscribe({
        next: (booking) => {
          this.booking = booking;
          this.loading = false;
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.error = 'Impossibile caricare la prenotazione.';
          this.changeDetector.markForCheck();
        },
      });
  }
  get dateLabel(): string {
    return this.booking
      ? new Date(`${this.booking.date}T12:00:00Z`).toLocaleDateString('it-IT', {
          timeZone: 'Europe/Rome',
        })
      : '';
  }
}
