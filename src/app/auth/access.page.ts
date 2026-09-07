import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { finalize } from 'rxjs';
import { Auth } from './auth';
import { returnDestination } from './return-url';

@Component({
  selector: 'app-access',
  imports: [FormsModule, RouterLink, IonContent],
  templateUrl: './access.page.html',
  styleUrls: ['./access.page.scss'],
})
export class AccessPage {
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly registering = this.route.snapshot.data['mode'] === 'register';
  readonly busy = signal(false);
  readonly error = signal('');
  registered() { return this.queryParams.get('registered') === '1'; }
  firstName = '';
  lastName = '';
  email = '';
  password = '';

  // Ionic conserva i form: l'URL attuale e autorevole anche dopo Indietro.
  private get queryParams() { return this.router.parseUrl(this.router.url).queryParamMap; }

  get returnQuery() {
    const destination = returnDestination(this.router, this.queryParams.get('returnUrl'));
    return destination ? { returnUrl: this.router.serializeUrl(destination) } : {};
  }

  ionViewWillEnter(): void {
    this.password = '';
    this.error.set('');
  }

  submit(): void {
    if (this.busy()) return;
    this.error.set('');
    const email = this.email.trim().toLowerCase();
    if (!email || !this.password || (this.registering && (!this.firstName.trim() || !this.lastName.trim()))) {
      this.error.set('Compila tutti i campi.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.error.set('Inserisci un indirizzo email valido.');
      return;
    }
    if (this.registering && (this.password.length < 8 || this.password.length > 64 ||
      /\s/.test(this.password) || !/[A-Z]/.test(this.password) || !/[a-z]/.test(this.password) ||
      !/[0-9]/.test(this.password) || !/[^A-Za-z0-9]/.test(this.password))) {
      this.error.set('La password deve rispettare tutti i requisiti indicati.');
      return;
    }
    this.busy.set(true);
    const request = this.registering
      ? this.auth.register({ firstName: this.firstName.trim(), lastName: this.lastName.trim(), email, password: this.password })
      : this.auth.login({ email, password: this.password });
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.password = '';
        if (this.registering) void this.router.navigate(['/login'], {
          queryParams: { ...this.returnQuery, registered: '1' }, replaceUrl: true,
        });
        else {
          const destination = returnDestination(this.router, this.queryParams.get('returnUrl'), this.auth.role);
          void this.router.navigateByUrl(destination ?? this.auth.homePath, { replaceUrl: true });
        }
      },
      error: error => {
        const messages: Record<string, string> = {
          INVALID_CREDENTIALS: 'Email o password non corrette.',
          EMAIL_ALREADY_EXISTS: 'Esiste già un account con questa email. Accedi oppure usa un altro indirizzo.',
          INVALID_EMAIL: 'Inserisci un indirizzo email valido.',
          INVALID_PASSWORD_FORMAT: 'La password non rispetta i requisiti indicati.',
          VALIDATION_ERROR: 'Controlla i campi e riprova.',
        };
        this.error.set(error.status === 0 ? 'Impossibile contattare il server. Controlla la connessione e riprova.'
          : messages[error.error?.error?.code] ?? 'Operazione non completata. Riprova tra poco.');
      },
    });
  }
}
