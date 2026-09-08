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
  template: `<ion-content><main>
    <a routerLink="/bookings">Torna alle prenotazioni</a><h1>Dettaglio prenotazione</h1>
    @if (error()) { <p role="alert">{{ error() }}</p> }
    @if (booking(); as item) {
      <h2>{{ item.spaceName }}</h2><p>Codice {{ item.id }} · {{ item.date }} · {{ item.startTime }}–{{ item.endTime }}</p>
      <h2>Partecipanti</h2>
      <ul>@for (person of item.participants; track person.participantId) {
        <li>{{ person.firstName }} {{ person.lastName }} — {{ person.email }}
          @if (person.participantRole === 'organizer') { <span>(Organizzatore)</span> }
          @if (person.present) { <span> · Check-in registrato</span> }
          @if (person.participantRole !== 'organizer' && (isOrganizer() || person.id === auth.user()?.id)) {
            <button type="button" [disabled]="busy()" (click)="remove(person)">{{ person.id === auth.user()?.id ? 'Abbandona prenotazione' : 'Rimuovi partecipante' }}</button>
          }
        </li>
      }</ul>
      @if (isOrganizer()) {
        <form (ngSubmit)="add()"><label for="participant-email">Aggiungi partecipante tramite email</label>
          <input id="participant-email" name="email" type="email" required [(ngModel)]="email" [disabled]="busy()">
          <button type="submit" [disabled]="busy()">Aggiungi</button>
        </form>
      }
      <p>Le modifiche sono consentite fino a un’ora prima dell’inizio.</p>
      <a [routerLink]="['/check-in', item.spaceId]">Apri check-in</a>
    } @else if (!error()) { <p role="status">Caricamento…</p> }
  </main></ion-content>`,
  styles: ['main { max-width: 800px; margin: auto; padding: 32px 20px; color: var(--slot-text); } a { color: var(--slot-primary-soft); } li { margin-bottom: 16px; overflow-wrap: anywhere; } form { display: grid; gap: 12px; } input { min-height: 44px; padding: 10px; border: 1px solid var(--slot-border); border-radius: 10px; background: var(--slot-surface); color: inherit; font: inherit; } button { min-height: 44px; padding: 10px 16px; margin: 6px; border: 0; border-radius: 10px; background: var(--slot-primary); color: white; font: inherit; cursor: pointer; } button:disabled { opacity: .6; cursor: wait; }'],
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
