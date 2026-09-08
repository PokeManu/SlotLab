import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular';
import { Auth } from '../auth/auth';
import { environment } from '../../environments/environment';
interface Participant { id: number; participantId: number; firstName: string; lastName: string; email: string; participantRole: string; present: boolean; }
interface Booking { id: number; spaceId: number; spaceName: string; date: string; startTime: string; endTime: string; participants: Participant[]; }
@Component({
  selector: 'app-user-booking-detail', imports: [IonContent, RouterLink, FormsModule],
  templateUrl: './booking-detail.page.html',
  styleUrls: ['./booking-detail.page.scss'],
})
export class UserBookingDetailPage {
  readonly auth = inject(Auth);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  readonly booking = signal<Booking | null>(null);
  readonly error = signal('');
  readonly busy = signal(false);
  email = '';
  private hasEntered = false;
  ngOnInit(): void { this.load(); }
  ionViewWillEnter(): void { if (this.hasEntered) this.load(); this.hasEntered = true; }
  isOrganizer(): boolean { return this.booking()?.participants.some(p => p.id === this.auth.user()?.id && p.participantRole === 'organizer') ?? false; }
  load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || !/^[1-9]\d*$/.test(id)) { this.error.set('Prenotazione non valida.'); return; }
    this.http.get<{ data: Booking }>(`${environment.apiUrl}/bookings/${id}`).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => this.booking.set(response.data), error: error => this.showError(error),
    });
  }
  private showError(error: HttpErrorResponse): void {
    this.busy.set(false);
    this.error.set(typeof error.error?.error?.message === 'string' ? error.error.error.message : 'Operazione non riuscita. Riprova.');
  }
  add(): void {
    if (this.busy() || !this.booking() || !this.email.trim()) return;
    this.busy.set(true); this.error.set('');
    this.http.post(`${environment.apiUrl}/bookings/${this.booking()!.id}/participants`, { email: this.email.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.email = ''; this.busy.set(false); this.load(); }, error: error => this.showError(error) });
  }
  remove(person: Participant): void {
    if (this.busy() || !this.booking()) return;
    this.busy.set(true); this.error.set('');
    this.http.delete(`${environment.apiUrl}/bookings/${this.booking()!.id}/participants/${person.participantId}`)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => {
        this.busy.set(false);
        if (person.id === this.auth.user()?.id) void this.router.navigate(['/bookings']); else this.load();
      }, error: error => this.showError(error) });
  }
}
