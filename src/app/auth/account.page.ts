import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonButton, IonCheckbox, IonContent, IonInput } from '@ionic/angular';
import { finalize } from 'rxjs';
import { PasswordRecoveryApi } from '../api/password-recovery-api';
import { Auth } from './auth';
import { passwordValidationMessages } from './password-validation';

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
  const password = control.get('newPassword')?.value;
  const confirmation = control.get('confirmation')?.value;
  return password && confirmation && password !== confirmation
    ? { passwordMismatch: true }
    : null;
}

@Component({
  selector: 'app-account',
  imports: [ReactiveFormsModule, RouterLink, IonButton, IonCheckbox, IonContent, IonInput],
  templateUrl: './account.page.html',
  styleUrls: ['./access.page.scss'],
})
export class AccountPage {
  readonly auth = inject(Auth);
  private readonly passwordRecovery = inject(PasswordRecoveryApi);
  readonly mode = inject(ActivatedRoute).snapshot.data['mode'] as
    | 'forgot'
    | 'password'
    | 'delete';
  readonly busy = signal(false);
  readonly error = signal('');
  readonly sent = signal(false);
  readonly form = new FormGroup(
    {
      email: new FormControl('', {
        nonNullable: true,
        validators: this.mode === 'forgot' ? [Validators.required, validEmail] : [],
      }),
      currentPassword: new FormControl('', {
        nonNullable: true,
        validators: this.mode === 'forgot' ? [] : [Validators.required],
      }),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: this.mode === 'password' ? [Validators.required, strongPassword] : [],
      }),
      confirmation: new FormControl('', {
        nonNullable: true,
        validators: this.mode === 'password' ? [Validators.required] : [],
      }),
      confirmed: new FormControl(false, {
        nonNullable: true,
        validators: this.mode === 'delete' ? [Validators.requiredTrue] : [],
      }),
    },
    { validators: this.mode === 'password' ? matchingPasswords : [] },
  );
  attemptedSubmit = false;

  get email() { return this.form.controls.email.value; }
  set email(value: string) { this.form.controls.email.setValue(value); }
  get currentPassword() { return this.form.controls.currentPassword.value; }
  set currentPassword(value: string) { this.form.controls.currentPassword.setValue(value); }
  get newPassword() { return this.form.controls.newPassword.value; }
  set newPassword(value: string) { this.form.controls.newPassword.setValue(value); }
  get confirmation() { return this.form.controls.confirmation.value; }
  set confirmation(value: string) { this.form.controls.confirmation.setValue(value); }
  get confirmed() { return this.form.controls.confirmed.value; }
  set confirmed(value: boolean) { this.form.controls.confirmed.setValue(value); }
  get passwordErrors(): string[] {
    return this.mode === 'password'
      ? passwordValidationMessages(this.newPassword)
      : [];
  }
  get title() {
    return this.mode === 'forgot'
      ? 'Recupera la password'
      : this.mode === 'delete'
        ? 'Elimina account'
        : 'Cambia password';
  }
  showError(name: keyof AccountPage['form']['controls']): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.attemptedSubmit);
  }
  ionViewWillEnter() {
    this.form.patchValue({
      currentPassword: '',
      newPassword: '',
      confirmation: '',
      confirmed: false,
    });
    this.form.markAsUntouched();
    this.attemptedSubmit = false;
    this.error.set('');
    this.sent.set(false);
  }
  submit() {
    if (this.busy() || this.auth.signingOut()) return;
    this.error.set('');
    this.attemptedSubmit = true;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    const request =
      this.mode === 'forgot'
        ? this.passwordRecovery.request(this.email.trim().toLowerCase())
        : this.auth.updateAccount(
            this.mode,
            this.currentPassword,
            this.newPassword,
          );
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.form.patchValue({ currentPassword: '', newPassword: '', confirmation: '' });
        this.sent.set(true);
      },
      error: (error) => {
        this.error.set(
          error.error?.error?.code === 'CURRENT_PASSWORD_INVALID'
            ? 'La password corrente non è corretta.'
            : error.error?.error?.code === 'INVALID_PASSWORD_FORMAT'
              ? 'La nuova password non rispetta i requisiti.'
              : error.status === 429
                ? 'Troppi tentativi. Attendi prima di riprovare.'
                : 'Operazione non completata. Controlla la connessione e riprova.',
        );
      },
    });
  }
}
