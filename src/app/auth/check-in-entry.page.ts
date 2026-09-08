import { Component, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-check-in-entry',
  imports: [IonContent, RouterLink],
  template: `
    <ion-content>
      <main class="check-in">
        <section class="check-in__card" aria-labelledby="check-in-title">
        <p class="check-in__eyebrow">SlotLab · Presenze</p>
        <h1 id="check-in-title">Check-in</h1>
        @if (validId) {
          <p class="check-in__intro">Spazio {{ spaceId }} · Verifica la tua presenza per la prenotazione.</p>
          @if (result(); as outcome) { <p role="status">{{ outcome.message }}</p> }
          @if (errorMessage()) { <p role="alert">{{ errorMessage() }}</p> }
          <button type="button" (click)="verify()" [disabled]="loading()">{{ loading() ? 'Verifica in corso…' : 'Verifica check-in' }}</button>
        } @else {
          <p>L’indirizzo del QR non è valido.</p>
        }
        <a routerLink="/home">Torna alla Home</a>
        </section>
      </main>
    </ion-content>`,
  styleUrl: './check-in-entry.page.scss',
})
export class CheckInEntryPage {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal(false);
  readonly result = signal<{ result: string; message: string; checkedInAt: string } | null>(null);
  readonly errorMessage = signal('');
  get spaceId() { return this.route.snapshot.paramMap.get('id') ?? ''; }
  get validId() { return /^[1-9]\d*$/.test(this.spaceId); }

  verify(): void {
    if (!this.validId || this.loading()) return;
    this.loading.set(true);
    this.result.set(null);
    this.errorMessage.set('');
    this.http.post<{ data: { result: string; message: string; checkedInAt: string } }>(`${environment.apiUrl}/spaces/${this.spaceId}/check-in`, {})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => { this.result.set(response.data); this.loading.set(false); },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(typeof error.error?.error?.message === 'string'
            ? error.error.error.message : 'Check-in non riuscito.');
          this.loading.set(false);
        },
      });
  }
}
