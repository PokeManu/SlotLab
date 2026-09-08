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
      <main>
        <h1>Check-in</h1>
        @if (validId) {
          <p>Spazio {{ spaceId }}</p>
          @if (result(); as outcome) { <p role="status">{{ outcome.message }}</p> }
          @if (errorMessage()) { <p role="alert">{{ errorMessage() }}</p> }
          <button type="button" (click)="verify()" [disabled]="loading()">{{ loading() ? 'Verifica in corso…' : 'Verifica check-in' }}</button>
        } @else {
          <p>L’indirizzo del QR non è valido.</p>
        }
        <a routerLink="/home">Torna alla Home</a>
      </main>
    </ion-content>`,
  styles: ['main { max-width: 600px; margin: 40px auto; padding: 24px; } p { line-height: 1.5; } a { display: block; margin-top: 20px; color: var(--slot-primary-soft); } button { min-height: 44px; padding: 12px 20px; border: 0; border-radius: 10px; background: var(--slot-primary); color: white; font: inherit; cursor: pointer; } button:disabled { opacity: .6; cursor: wait; } button:focus-visible { outline: 2px solid var(--slot-primary-soft); outline-offset: 3px; }'],
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
