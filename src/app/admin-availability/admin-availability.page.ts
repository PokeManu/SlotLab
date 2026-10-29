import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { romeDate } from '../models/rome-date';
import { IonButton, IonContent, IonInput, IonSelect, IonSelectOption } from '@ionic/angular';
import { finalize } from 'rxjs';
import {
  AdminAvailability,
  AdminAvailabilityApi,
  AdminAvailabilityPayload,
  AdminAvailabilitySpace,
  AdminUnavailability,
  AdminUnavailabilityPayload,
} from '../api/admin-availability-api';
function scheduleOrder(control: AbstractControl): ValidationErrors | null {
  const { validFrom, validUntil, startTime, endTime } = control.value;
  const errors: ValidationErrors = {};
  if (validFrom && validUntil && validFrom > validUntil)
    errors['invalidPeriod'] = true;
  if (startTime && endTime && startTime >= endTime)
    errors['invalidTime'] = true;
  return Object.keys(errors).length ? errors : null;
}
@Component({
  selector: 'app-admin-availability',
  templateUrl: './admin-availability.page.html',
  styleUrls: ['./admin-availability.page.scss'],
  imports: [IonButton, IonContent, IonInput, IonSelect, IonSelectOption, FormsModule, ReactiveFormsModule],
})
export class AdminAvailabilityPage implements OnInit {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly api = inject(AdminAvailabilityApi);
  private loadVersion = 0;
  busyRow: string | null = null;
  spaces: AdminAvailabilitySpace[] = [];
  rows: AdminAvailability[] = [];
  unavailabilities: AdminUnavailability[] = [];
  spaceId = 0;
  error = '';
  editingId: number | null = null;
  reusingId: number | null = null;
  showRetired = false;
  reuseMessage = '';
  savingSchedule = false;
  scheduleAttempted = false;
  readonly form = new FormGroup({
    validFrom: new FormControl(romeDate(), { nonNullable: true, validators: Validators.required }),
    validUntil: new FormControl('2099-12-31', { nonNullable: true, validators: Validators.required }),
    weekday: new FormControl<number | null>(1, [Validators.required, Validators.min(1), Validators.max(7)]),
    startTime: new FormControl('08:00', { nonNullable: true, validators: Validators.required }),
    endTime: new FormControl('20:00', { nonNullable: true, validators: Validators.required }),
  }, { validators: scheduleOrder });
  savingException = false;
  exceptionAttempted = false;
  readonly exceptionForm = new FormGroup({
    date: new FormControl(romeDate(), { nonNullable: true, validators: Validators.required }),
    startTime: new FormControl('08:00', { nonNullable: true, validators: Validators.required }),
    endTime: new FormControl('20:00', { nonNullable: true, validators: Validators.required }),
    reason: new FormControl('', { nonNullable: true, validators: (control) =>
      String(control.value).trim() ? null : { required: true } }),
  }, { validators: scheduleOrder });
  get visibleRows(): AdminAvailability[] {
    return this.showRetired
      ? this.rows
      : this.rows.filter((row) => !row.isRetired);
  }
  get retiredCount(): number {
    return this.rows.filter((row) => row.isRetired).length;
  }
  showScheduleError(name: keyof AdminAvailabilityPage['form']['controls']): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.scheduleAttempted);
  }
  get showPeriodError(): boolean {
    return this.form.hasError('invalidPeriod') && this.scheduleAttempted;
  }
  get showTimeError(): boolean {
    return this.form.hasError('invalidTime') && this.scheduleAttempted;
  }
  showExceptionError(name: keyof AdminAvailabilityPage['exceptionForm']['controls']): boolean {
    const control = this.exceptionForm.controls[name];
    return control.invalid && (control.touched || this.exceptionAttempted);
  }
  get showExceptionTimeError(): boolean {
    return this.exceptionForm.hasError('invalidTime') && this.exceptionAttempted;
  }
  ngOnInit(): void {
    this.api.listSpaces()
      .subscribe({
        next: (response) => {
          this.spaces = response.data;
          this.changeDetector.markForCheck();
          if (this.spaces[0]) {
            this.spaceId = this.spaces[0].id;
            this.load();
          }
        },
        error: () => {
          this.error = 'Impossibile caricare gli spazi.';
          this.changeDetector.markForCheck();
        },
      });
  }
  selectSpace(): void {
    if (this.savingSchedule || this.savingException || this.busyRow) return;
    this.form.reset({
      validFrom: romeDate(),
      validUntil: '2099-12-31',
      weekday: 1,
      startTime: '08:00',
      endTime: '20:00',
    });
    this.scheduleAttempted = false;
    this.exceptionForm.reset({
      date: romeDate(),
      startTime: '08:00',
      endTime: '20:00',
      reason: '',
    });
    this.exceptionAttempted = false;
    this.rows = [];
    this.unavailabilities = [];
    this.load();
  }
  load(): void {
    const version = ++this.loadVersion;
    this.editingId = null;
    this.reusingId = null;
    this.reuseMessage = '';
    this.error = '';
    this.changeDetector.markForCheck();
    if (!this.spaceId) return;
    this.api.listAvailability(this.spaceId)
      .subscribe({
        next: (rows) => {
          if (version !== this.loadVersion) return;
          this.rows = rows;
          this.changeDetector.markForCheck();
        },
        error: () => {
          if (version !== this.loadVersion) return;
          this.error = 'Impossibile caricare le disponibilità.';
          this.changeDetector.markForCheck();
        },
      });
    this.api.listUnavailability(this.spaceId)
      .subscribe({
        next: (rows) => {
          if (version !== this.loadVersion) return;
          this.unavailabilities = rows;
          this.changeDetector.markForCheck();
        },
        error: () => {
          if (version !== this.loadVersion) return;
          this.error = 'Impossibile caricare le indisponibilità.';
          this.changeDetector.markForCheck();
        },
      });
  }
  edit(row: AdminAvailability): void {
    if (this.savingSchedule || this.savingException || this.busyRow) return;
    this.reuseMessage = '';
    this.editingId = row.availabilityId;
    this.reusingId = null;
    this.form.reset({
      validFrom: row.validFrom,
      validUntil: row.validUntil,
      weekday: row.weekday,
      startTime: row.startTime,
      endTime: row.endTime,
    });
    this.scheduleAttempted = false;
  }
  reuse(row: AdminAvailability): void {
    if (this.savingSchedule || this.savingException || this.busyRow) return;
    this.editingId = null;
    this.reusingId = row.availabilityId;
    this.error = '';
    this.form.reset({
      validFrom: row.validFrom,
      validUntil: row.validUntil,
      weekday: row.weekday,
      startTime: row.startTime,
      endTime: row.endTime,
    });
    this.scheduleAttempted = false;
    this.reuseMessage =
      'Dati copiati nel modulo. Controlla il periodo e premi “Riattiva fascia”.';
  }
  create(): void {
    if (this.savingSchedule || this.savingException || this.busyRow || !this.spaceId) return;
    this.scheduleAttempted = true;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const payload: AdminAvailabilityPayload = { ...value, weekday: Number(value.weekday) };
    this.savingSchedule = true;
    this.form.disable();
    const request =
      this.reusingId !== null
        ? this.api.reuseAvailability(this.spaceId, this.reusingId, payload)
        : this.editingId === null
          ? this.api.createAvailability(this.spaceId, payload)
          : this.api.updateAvailability(this.spaceId, this.editingId, payload);
    request.pipe(finalize(() => {
      this.savingSchedule = false;
      this.form.enable();
      this.changeDetector.markForCheck();
    })).subscribe({
      next: () => {
        this.editingId = null;
        this.reusingId = null;
        this.scheduleAttempted = false;
        this.load();
      },
      error: () => {
        this.error = 'La fascia non è valida o si sovrappone a una esistente.';
        this.changeDetector.markForCheck();
      },
    });
  }
  retire(row: AdminAvailability): void {
    if (this.savingSchedule || this.savingException || this.busyRow || !this.spaceId) return;
    this.busyRow = `availability:${row.availabilityId}`;
    this.api
      .retireAvailability(this.spaceId, row.availabilityId)
      .pipe(finalize(() => {
        this.busyRow = null;
        this.changeDetector.markForCheck();
      }))
      .subscribe({
        next: () => this.load(),
        error: () => {
          this.error = 'Impossibile ritirare la fascia.';
          this.changeDetector.markForCheck();
        },
      });
  }
  createException(): void {
    if (this.savingException || this.savingSchedule || this.busyRow || !this.spaceId) return;
    this.exceptionAttempted = true;
    this.exceptionForm.markAllAsTouched();
    if (this.exceptionForm.invalid) return;
    const payload: AdminUnavailabilityPayload = this.exceptionForm.getRawValue();
    this.savingException = true;
    this.exceptionForm.disable();
    this.api
      .createUnavailability(this.spaceId, payload)
      .pipe(finalize(() => {
        this.savingException = false;
        this.exceptionForm.enable();
        this.changeDetector.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.exceptionForm.patchValue({ reason: '' });
          this.exceptionForm.markAsUntouched();
          this.exceptionAttempted = false;
          this.changeDetector.markForCheck();
          this.load();
        },
        error: () => {
          this.error = 'Indisponibilità non valida.';
          this.changeDetector.markForCheck();
        },
      });
  }
  removeException(row: AdminUnavailability): void {
    if (this.savingSchedule || this.savingException || this.busyRow || !this.spaceId) return;
    this.busyRow = `exception:${row.id}`;
    this.api
      .removeUnavailability(this.spaceId, row.id)
      .pipe(finalize(() => {
        this.busyRow = null;
        this.changeDetector.markForCheck();
      }))
      .subscribe({
        next: () => this.load(),
        error: () => {
          this.error = 'Impossibile rimuovere l’indisponibilità.';
          this.changeDetector.markForCheck();
        },
      });
  }
}
