import { Component, inject } from '@angular/core';
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
          @if (result) { <p role="status">{{ result.message }}</p> }
          @if (errorMessage) { <p role="alert">{{ errorMessage }}</p> }
          <button type="button" (click)="verify()" [disabled]="loading">{{ loading ? 'Verifica in corso…' : 'Verifica check-in' }}</button>
        } @else {
          <p>L’indirizzo del QR non è valido.</p>
        }
        <a routerLink="/home">Torna alla Home</a>
      </main>
    </ion-content>`,
  styles: ['main { max-width: 600px; margin: 40px auto; padding: 24px; } p { line-height: 1.5; } a { color: var(--slot-primary-soft); }'],
})
export class CheckInEntryPage {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  loading = false;
  result: { result: string; message: string; checkedInAt: string } | null = null;
  errorMessage = '';
  get spaceId() { return this.route.snapshot.paramMap.get('id') ?? ''; }
  get validId() { return /^[1-9]\d*$/.test(this.spaceId); }

  verify(): void {
    if (!this.validId || this.loading) return;
    this.loading = true;
    this.errorMessage = '';
    this.http.post<{ data: { result: string; message: string; checkedInAt: string } }>(`${environment.apiUrl}/spaces/${this.spaceId}/check-in`, {})
      .subscribe({
        next: response => { this.result = response.data; this.loading = false; },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = error.error?.error?.message ?? 'Check-in non riuscito.';
          this.loading = false;
        },
      });
  }
}
