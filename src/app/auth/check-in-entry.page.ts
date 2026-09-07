import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';

@Component({
  selector: 'app-check-in-entry',
  imports: [IonContent, RouterLink],
  template: `
    <ion-content>
      <main>
        <h1>Check-in</h1>
        @if (validId) {
          <p>Spazio {{ spaceId }}</p>
          <p>Il check-in non è ancora disponibile. Nessuna presenza è stata registrata.</p>
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
  get spaceId() { return this.route.snapshot.paramMap.get('id') ?? ''; }
  get validId() { return /^[1-9]\d*$/.test(this.spaceId); }
}
