import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonBadge, IonButton, IonContent, IonInput, IonSpinner } from '@ionic/angular';
import { Auth } from '../auth/auth';
import { BookingDetail, BookingParticipant, BookingsApi } from '../api/bookings-api';
@Component({
  selector: 'app-user-booking-detail',
  imports: [IonBadge, IonButton, IonContent, IonInput, IonSpinner, RouterLink, FormsModule],
  templateUrl: './booking-detail.page.html',
  styleUrls: ['./booking-detail.page.scss'],
})
export class UserBookingDetailPage implements OnInit {
  readonly auth = inject(Auth);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingsApi = inject(BookingsApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly booking = signal<BookingDetail | null>(null);
  readonly error = signal('');
  readonly busy = signal(false);
  email = '';
  attemptedAdd = false;
  get emailInvalid(): boolean {
    return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }
  private hasEntered = false;
  private loadRequest?: Subscription;
  ngOnInit(): void {
    this.load();
  }
  ionViewWillEnter(): void {
    if (this.hasEntered) this.load();
    this.hasEntered = true;
  }
  isOrganizer(): boolean {
    return (
      this.booking()?.participants.some(
        (p) =>
          p.id === this.auth.user()?.id && p.participantRole === 'organizer',
      ) ?? false
    );
  }
  load(): void {
    this.loadRequest?.unsubscribe();
    this.booking.set(null);
    this.error.set('');
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || !/^[1-9]\d*$/.test(id)) {
      this.error.set('Prenotazione non valida.');
      return;
    }
    this.loadRequest = this.bookingsApi
      .detail(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (booking) => this.booking.set(booking),
        error: (error) => this.showError(error),
      });
  }
  private showError(error: HttpErrorResponse): void {
    this.busy.set(false);
    this.error.set(
      typeof error.error?.error?.message === 'string'
        ? error.error.error.message
        : 'Operazione non riuscita. Riprova.',
    );
  }
  add(): void {
    if (this.busy() || !this.booking()) return;
    this.attemptedAdd = true;
    if (this.emailInvalid) {
      this.error.set('');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.bookingsApi
      .addParticipant(this.booking()!.id, this.email.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.email = '';
          this.attemptedAdd = false;
          this.busy.set(false);
          this.load();
        },
        error: (error) => this.showError(error),
      });
  }
  remove(person: BookingParticipant): void {
    if (this.busy() || !this.booking()) return;
    this.busy.set(true);
    this.error.set('');
    this.bookingsApi
      .removeParticipant(this.booking()!.id, person.participantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          if (person.id === this.auth.user()?.id)
            void this.router.navigate(['/bookings']);
          else this.load();
        },
        error: (error) => this.showError(error),
      });
  }
}
