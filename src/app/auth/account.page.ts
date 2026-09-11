import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular';
import { finalize } from 'rxjs';
import { Auth } from './auth';
import { environment } from '../../environments/environment';
import { passwordValidationMessages } from './password-validation';

@Component({
  selector: 'app-account', imports: [FormsModule, RouterLink, IonContent],
  templateUrl: './account.page.html', styleUrls: ['./access.page.scss'],
})
export class AccountPage {
  readonly auth = inject(Auth);
  private readonly http = inject(HttpClient);
  readonly mode = inject(ActivatedRoute).snapshot.data['mode'] as 'forgot' | 'password' | 'delete';
  readonly busy = signal(false);
  readonly error = signal('');
  readonly sent = signal(false);
  email = '';
  currentPassword = '';
  newPassword = '';
  confirmation = '';
  confirmed = false;
  attemptedSubmit = false;
  get passwordErrors(): string[] { return this.mode === 'password' ? passwordValidationMessages(this.newPassword) : []; }
  get title() { return this.mode === 'forgot' ? 'Recupera la password' : this.mode === 'delete' ? 'Elimina account' : 'Cambia password'; }
  ionViewWillEnter() {
    this.currentPassword = this.newPassword = this.confirmation = '';
    this.confirmed = false;
    this.attemptedSubmit = false;
    this.error.set(''); this.sent.set(false);
  }
  submit() {
    if (this.busy() || this.auth.signingOut()) return;
    this.error.set('');
    this.attemptedSubmit = this.mode === 'password';
    if (this.mode === 'forgot' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      this.error.set('Inserisci un indirizzo email valido.'); return;
    }
    if (this.mode !== 'forgot' && !this.currentPassword) { this.error.set('Inserisci la password corrente.'); return; }
    if (this.mode === 'delete' && !this.confirmed) { this.error.set('Conferma la cancellazione definitiva.'); return; }
    if (this.mode === 'password' && (this.newPassword !== this.confirmation || this.passwordErrors.length)) return;
    this.busy.set(true);
    const request = this.mode === 'forgot'
      ? this.http.post<void>(`${environment.apiUrl}/auth/forgot-password`, { email: this.email.trim().toLowerCase() })
      : this.auth.updateAccount(this.mode, this.currentPassword, this.newPassword);
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => { this.currentPassword = this.newPassword = this.confirmation = ''; this.sent.set(true); },
      error: error => {
        this.error.set(error.error?.error?.code === 'CURRENT_PASSWORD_INVALID' ? 'La password corrente non è corretta.'
          : error.error?.error?.code === 'INVALID_PASSWORD_FORMAT' ? 'La nuova password non rispetta i requisiti.'
          : error.status === 429 ? 'Troppi tentativi. Attendi prima di riprovare.'
          : 'Operazione non completata. Controlla la connessione e riprova.');
      },
    });
  }
}
