import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  eyeOffOutline,
  eyeOutline,
  idCardOutline,
  lockClosedOutline,
  mailOutline,
  personOutline,
} from 'ionicons/icons';
import { finalize } from 'rxjs';
import { Auth } from './auth';
import { returnDestination } from './return-url';
import { passwordValidationMessages } from './password-validation';
@Component({
  selector: 'app-access',
  imports: [FormsModule, RouterLink, IonContent, IonIcon],
  templateUrl: './access.page.html',
  styleUrls: ['./access.page.scss'],
})
export class AccessPage implements OnDestroy {
  @ViewChild(IonContent) private content?: IonContent;
  readonly auth = inject(Auth);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private viewportObserver?: ResizeObserver;
  private viewportFrame?: number;
  readonly registering = this.route.snapshot.data['mode'] === 'register';
  readonly busy = signal(false);
  readonly error = signal('');
  registered() {
    return this.queryParams.get('registered') === '1';
  }
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  passwordConfirmation = '';
  passwordTouched = false;
  confirmationTouched = false;
  attemptedSubmit = false;
  showPassword = false;
  showPasswordConfirmation = false;
  constructor() {
    addIcons({
      eyeOffOutline,
      eyeOutline,
      idCardOutline,
      lockClosedOutline,
      mailOutline,
      personOutline,
    });
  }
  private get queryParams() {
    return this.router.parseUrl(this.router.url).queryParamMap;
  }
  get returnQuery() {
    const destination = returnDestination(
      this.router,
      this.queryParams.get('returnUrl'),
    );
    return destination
      ? { returnUrl: this.router.serializeUrl(destination) }
      : {};
  }
  ionViewWillEnter(): void {
    this.password = '';
    this.passwordConfirmation = '';
    this.passwordTouched = false;
    this.confirmationTouched = false;
    this.attemptedSubmit = false;
    this.showPassword = false;
    this.showPasswordConfirmation = false;
    this.error.set('');
  }

  async ionViewDidEnter(): Promise<void> {
    const scrollElement = await this.content?.getScrollElement();
    if (!scrollElement) return;

    this.stopViewportTracking();
    const updateHeight = () => {
      if (this.viewportFrame !== undefined) {
        window.cancelAnimationFrame(this.viewportFrame);
      }
      this.viewportFrame = window.requestAnimationFrame(() => {
        this.viewportFrame = undefined;
        this.host.nativeElement.style.setProperty(
          '--slot-access-height',
          `${scrollElement.clientHeight}px`,
        );
      });
    };

    updateHeight();
    this.viewportObserver = new ResizeObserver(updateHeight);
    this.viewportObserver.observe(scrollElement);
  }

  ionViewDidLeave(): void {
    this.stopViewportTracking();
  }

  ngOnDestroy(): void {
    this.stopViewportTracking();
  }

  private stopViewportTracking(): void {
    this.viewportObserver?.disconnect();
    this.viewportObserver = undefined;
    if (this.viewportFrame !== undefined) {
      window.cancelAnimationFrame(this.viewportFrame);
      this.viewportFrame = undefined;
    }
  }
  get passwordErrors(): string[] {
    if (!this.registering) return [];
    return passwordValidationMessages(this.password);
  }
  get showPasswordErrors(): boolean {
    return (
      this.registering &&
      this.passwordErrors.length > 0 &&
      (this.password.length > 0 || this.passwordTouched || this.attemptedSubmit)
    );
  }
  get confirmationError(): string {
    if (
      !this.registering ||
      (!this.passwordConfirmation &&
        !this.confirmationTouched &&
        !this.attemptedSubmit)
    )
      return '';
    if (!this.passwordConfirmation) return 'Conferma la password.';
    if (this.passwordConfirmation !== this.password)
      return 'Le password non coincidono.';
    return '';
  }
  submit(): void {
    if (this.busy()) return;
    this.error.set('');
    this.attemptedSubmit = this.registering;
    const email = this.email.trim().toLowerCase();
    if (
      !email ||
      !this.password ||
      (this.registering &&
        (!this.firstName.trim() ||
          !this.lastName.trim() ||
          !this.passwordConfirmation))
    ) {
      this.error.set('Compila tutti i campi.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.error.set('Inserisci un indirizzo email valido.');
      return;
    }
    if (this.registering && this.passwordErrors.length > 0) {
      return;
    }
    if (this.registering && this.password !== this.passwordConfirmation) {
      return;
    }
    this.busy.set(true);
    const request = this.registering
      ? this.auth.register({
          firstName: this.firstName.trim(),
          lastName: this.lastName.trim(),
          email,
          password: this.password,
        })
      : this.auth.login({ email, password: this.password });
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.password = '';
        this.passwordConfirmation = '';
        if (this.registering)
          void this.router.navigate(['/login'], {
            queryParams: { ...this.returnQuery, registered: '1' },
            replaceUrl: true,
          });
        else {
          const destination = returnDestination(
            this.router,
            this.queryParams.get('returnUrl'),
            this.auth.role,
          );
          void this.router.navigateByUrl(destination ?? this.auth.homePath, {
            replaceUrl: true,
          });
        }
      },
      error: (error) => {
        const messages: Record<string, string> = {
          INVALID_CREDENTIALS: 'Email o password non corrette.',
          EMAIL_ALREADY_EXISTS:
            'Esiste già un account con questa email. Accedi oppure usa un altro indirizzo.',
          INVALID_EMAIL: 'Inserisci un indirizzo email valido.',
          INVALID_PASSWORD_FORMAT:
            'La password non rispetta i requisiti indicati.',
          VALIDATION_ERROR: 'Controlla i campi e riprova.',
        };
        this.error.set(
          error.status === 0
            ? 'Impossibile contattare il server. Controlla la connessione e riprova.'
            : (messages[error.error?.error?.code] ??
                'Operazione non completata. Riprova tra poco.'),
        );
      },
    });
  }
}
