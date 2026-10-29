import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput } from '@ionic/angular';
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

function trimmedRequired(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() ? null : { required: true };
}

function validEmail(control: AbstractControl): ValidationErrors | null {
  const email = String(control.value ?? '').trim().toLowerCase();
  return Validators.email(new FormControl(email)) === null &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? null
    : { email: true };
}

function strongPassword(control: AbstractControl): ValidationErrors | null {
  return passwordValidationMessages(String(control.value ?? '')).length
    ? { passwordRules: true }
    : null;
}

function matchingPasswords(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmation = control.get('passwordConfirmation')?.value;
  return password && confirmation && password !== confirmation
    ? { passwordMismatch: true }
    : null;
}

@Component({
  selector: 'app-access',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
  ],
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
  readonly form = new FormGroup(
    {
      firstName: new FormControl('', {
        nonNullable: true,
        validators: this.registering
          ? [Validators.required, trimmedRequired]
          : [],
      }),
      lastName: new FormControl('', {
        nonNullable: true,
        validators: this.registering
          ? [Validators.required, trimmedRequired]
          : [],
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, validEmail],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: this.registering
          ? [Validators.required, strongPassword]
          : [Validators.required],
      }),
      passwordConfirmation: new FormControl('', {
        nonNullable: true,
        validators: this.registering ? [Validators.required] : [],
      }),
    },
    { validators: this.registering ? matchingPasswords : [] },
  );
  registered() {
    return this.queryParams.get('registered') === '1';
  }
  get firstName() {
    return this.form.controls.firstName.value;
  }
  set firstName(value: string) {
    this.form.controls.firstName.setValue(value);
  }
  get lastName() {
    return this.form.controls.lastName.value;
  }
  set lastName(value: string) {
    this.form.controls.lastName.setValue(value);
  }
  get email() {
    return this.form.controls.email.value;
  }
  set email(value: string) {
    this.form.controls.email.setValue(value);
  }
  get password() {
    return this.form.controls.password.value;
  }
  set password(value: string) {
    this.form.controls.password.setValue(value);
  }
  get passwordConfirmation() {
    return this.form.controls.passwordConfirmation.value;
  }
  set passwordConfirmation(value: string) {
    this.form.controls.passwordConfirmation.setValue(value);
  }
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
    this.form.controls.password.markAsUntouched();
    this.form.controls.passwordConfirmation.markAsUntouched();
    this.attemptedSubmit = false;
    this.showPassword = false;
    this.showPasswordConfirmation = false;
    this.error.set('');
  }
  get passwordErrors(): string[] {
    if (!this.registering) return [];
    return passwordValidationMessages(this.password);
  }
  get showEmailError(): boolean {
    return (
      !!this.email &&
      this.form.controls.email.invalid &&
      (this.form.controls.email.touched || this.attemptedSubmit)
    );
  }
  get showPasswordErrors(): boolean {
    return (
      this.registering &&
      this.passwordErrors.length > 0 &&
      (this.password.length > 0 ||
        this.form.controls.password.touched ||
        this.attemptedSubmit)
    );
  }
  get confirmationError(): string {
    if (
      !this.registering ||
      (!this.passwordConfirmation &&
        !this.form.controls.passwordConfirmation.touched &&
        !this.attemptedSubmit)
    )
      return '';
    if (!this.passwordConfirmation) return 'Conferma la password.';
    if (this.form.hasError('passwordMismatch'))
      return 'Le password non coincidono.';
    return '';
  }
  submit(): void {
    if (this.busy()) return;
    this.error.set('');
    this.attemptedSubmit = true;
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
    if (this.form.controls.email.invalid) {
      this.error.set('Inserisci un indirizzo email valido.');
      return;
    }
    if (this.registering && this.passwordErrors.length > 0) {
      return;
    }
    if (this.form.invalid) {
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
    this.form.disable({ emitEvent: false });
    request.pipe(finalize(() => {
      this.busy.set(false);
      this.form.enable({ emitEvent: false });
    })).subscribe({
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
