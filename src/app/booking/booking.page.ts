import { Auth } from '../auth/auth';
import { romeDate } from '../models/rome-date';
import { SpacesApi } from '../api/spaces-api';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  bookOutline,
  calendarOutline,
  chevronDownOutline,
  desktopOutline,
  peopleOutline,
  removeOutline,
  timeOutline,
} from 'ionicons/icons';
import { Space } from '../data/spaces.data';
import { BookingsApi } from '../api/bookings-api';
@Component({
  selector: 'app-booking',
  templateUrl: './booking.page.html',
  styleUrls: ['./booking.page.scss'],
  imports: [
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    RouterLink,
    ReactiveFormsModule,
  ],
})
export class BookingPage implements OnInit, OnDestroy {
  space: Space;
  get participants(): number {
    return 1 + this.form.controls.participantEmails.length;
  }
  selectedTime = '';
  attemptedSubmit = false;
  private readonly auth = inject(Auth);
  private readonly distinctParticipants = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    const emails = (control.value as string[]).map((email) =>
      email.trim().toLowerCase(),
    );
    return emails.some(
      (email, index) => email && emails.indexOf(email) !== index,
    )
      ? { duplicateEmails: true }
      : null;
  };
  readonly form = new FormGroup({
    date: new FormControl(romeDate(), {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^\d{4}-\d{2}-\d{2}$/),
      ],
    }),
    availabilityId: new FormControl<number | null>(null, Validators.required),
    participantEmails: new FormArray<FormControl<string>>(
      [],
      this.distinctParticipants,
    ),
  });
  get selectedDate(): string {
    return this.form.controls.date.value;
  }
  set selectedDate(value: string) {
    this.form.controls.date.setValue(value);
  }
  get selectedAvailabilityId(): number | null {
    return this.form.controls.availabilityId.value;
  }
  set selectedAvailabilityId(value: number | null) {
    this.form.controls.availabilityId.setValue(value);
  }
  get participantEmails(): string[] {
    return this.form.controls.participantEmails.value;
  }
  set participantEmails(values: string[]) {
    const controls = this.form.controls.participantEmails;
    controls.clear();
    values.forEach((value) => controls.push(this.participantEmailControl(value)));
  }
  errorMessage = '';
  submitting = false;
  private lastRequest = '';
  private requestKey = '';
  private readonly spacesApi = inject(SpacesApi);
  private readonly bookingsApi = inject(BookingsApi);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private hasEntered = false;
  private spaceRequest?: Subscription;
  private availabilityRequest?: Subscription;
  loadingAvailability = false;
  availabilityError = '';
  timeSlots: Array<{
    id: number;
    label: string;
    availableSeats: number;
  }> = [];
  constructor() {
    const spaceId = this.activatedRoute.snapshot.paramMap.get('id');
    this.space = {
      id: spaceId ?? '',
      name: '',
      type: '',
      building: '',
      floor: 0,
      seats: 0,
      accessible: false,
      image: '',
      services: [],
    };
    addIcons({
      addOutline,
      arrowBackOutline,
      bookOutline,
      calendarOutline,
      chevronDownOutline,
      desktopOutline,
      peopleOutline,
      removeOutline,
      timeOutline,
    });
  }
  ngOnInit(): void {
    this.loadSpace();
  }
  ionViewWillEnter(): void {
    if (this.hasEntered) this.loadSpace();
    this.hasEntered = true;
  }
  ngOnDestroy(): void {
    this.spaceRequest?.unsubscribe();
    this.availabilityRequest?.unsubscribe();
  }
  private loadSpace(): void {
    this.spaceRequest?.unsubscribe();
    this.availabilityRequest?.unsubscribe();
    this.timeSlots = [];
    this.selectedAvailabilityId = null;
    this.selectedTime = '';
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    if (!id || !/^\d+$/.test(id)) return;
    this.loadingAvailability = true;
    this.availabilityError = '';
    this.changeDetector.markForCheck();
    this.spaceRequest = this.spacesApi
      .detail(id)
      .subscribe({
        next: ({ space }) => {
          this.space = space;
          this.loadAvailability(id);
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.loadingAvailability = false;
          this.availabilityError =
            'Impossibile caricare lo spazio. Riapri la pagina per riprovare.';
          this.changeDetector.markForCheck();
        },
      });
  }
  changeDate(): void {
    if (/^\d+$/.test(this.space.id)) this.loadAvailability(this.space.id);
  }
  openDatePicker(input: HTMLInputElement): void {
    input.focus({ preventScroll: true });
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
        return;
      }
    } catch {}
    input.click();
  }
  openDatePickerFromKeyboard(
    input: HTMLInputElement,
    event: KeyboardEvent,
  ): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.openDatePicker(input);
  }
  get selectedDateLabel(): string {
    return new Date(`${this.selectedDate}T12:00:00Z`).toLocaleDateString(
      'it-IT',
      {
        timeZone: 'Europe/Rome',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      },
    );
  }
  private loadAvailability(spaceId: string): void {
    this.availabilityRequest?.unsubscribe();
    this.loadingAvailability = true;
    this.availabilityError = '';
    this.changeDetector.markForCheck();
    this.timeSlots = [];
    this.selectedAvailabilityId = null;
    this.selectedTime = '';
    this.availabilityRequest = this.spacesApi
      .availability(spaceId, this.selectedDate)
      .subscribe({
        next: (slots) => {
          this.loadingAvailability = false;
          this.timeSlots = slots
            .filter((slot) => slot.bookable)
            .map((slot) => ({
              id: slot.availabilityId,
              label: `${slot.startTime}-${slot.endTime}`,
              availableSeats: slot.availableSeats,
            }));
          this.selectedAvailabilityId = this.timeSlots[0]?.id ?? null;
          this.selectedTime = this.timeSlots[0]?.label ?? '';
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.loadingAvailability = false;
          this.availabilityError =
            'Impossibile caricare le fasce. Seleziona nuovamente la data per riprovare.';
          this.changeDetector.markForCheck();
        },
      });
  }
  selectTime(time: { id: number; label: string }): void {
    this.selectedTime = time.label;
    this.selectedAvailabilityId = time.id;
  }
  get participantLimit(): number {
    return (
      this.timeSlots.find((slot) => slot.id === this.selectedAvailabilityId)
        ?.availableSeats ?? this.space.seats
    );
  }
  increaseParticipants(): void {
    if (this.submitting || this.participants >= this.participantLimit) return;
    this.form.controls.participantEmails.push(this.participantEmailControl());
  }
  decreaseParticipants(): void {
    if (this.submitting || this.participants <= 1) return;
    this.form.controls.participantEmails.removeAt(this.participants - 2);
  }
  private participantEmailControl(value = ''): FormControl<string> {
    return new FormControl(value, {
      nonNullable: true,
      validators: [
        Validators.required,
        (control) => {
          const email = String(control.value ?? '').trim().toLowerCase();
          if (
            !email ||
            Validators.email(new FormControl(email)) !== null ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            /[,;]/.test(email)
          )
            return { email: true };
          return email === this.auth.user()?.email.trim().toLowerCase()
            ? { organizerEmail: true }
            : null;
        },
      ],
    });
  }
  emailError(index: number): string {
    const control = this.form.controls.participantEmails.at(index);
    const email = control.value.trim().toLowerCase();
    if (!email) return 'Inserisci l’email del partecipante.';
    if (control.hasError('email'))
      return 'Inserisci una sola email valida.';
    if (control.hasError('organizerEmail'))
      return 'Sei già incluso come organizzatore.';
    if (this.form.controls.participantEmails.hasError('duplicateEmails')) {
      const duplicate = this.participantEmails.some(
        (value, other) =>
          other !== index && value.trim().toLowerCase() === email,
      );
      if (duplicate) return 'Questa email è già presente nel gruppo.';
    }
    return '';
  }
  get durationLabel(): string {
    if (!this.selectedTime) return 'Seleziona una fascia';
    const [start, end] = this.selectedTime.split('-').map((time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    });
    return `${end - start} minuti`;
  }
  confirmBooking(): void {
    if (
      !this.selectedAvailabilityId ||
      !/^\d+$/.test(this.space.id) ||
      this.submitting
    )
      return;
    this.errorMessage = '';
    this.attemptedSubmit = true;
    if (this.form.controls.participantEmails.invalid) {
      this.errorMessage = 'Controlla le email dei partecipanti.';
      return;
    }
    if (
      this.form.controls.date.invalid ||
      this.form.controls.availabilityId.invalid
    ) {
      this.errorMessage = 'Seleziona una data e una fascia valide.';
      return;
    }
    if (this.participants > this.participantLimit) {
      this.errorMessage =
        'I partecipanti superano i posti disponibili nella fascia selezionata. Riduci il numero o scegli un’altra fascia.';
      return;
    }
    this.submitting = true;
    const participantEmails = this.participantEmails.map((email) =>
      email.trim().toLowerCase(),
    );
    const body = {
      spaceId: Number(this.space.id),
      date: this.selectedDate,
      availabilityId: this.selectedAvailabilityId,
      participantEmails,
    };
    const serialized = JSON.stringify(body);
    if (serialized !== this.lastRequest) {
      this.lastRequest = serialized;
      this.requestKey = crypto.randomUUID();
    }
    this.form.disable({ emitEvent: false });
    this.bookingsApi
      .create(body, this.requestKey)
      .subscribe({
        next: (response) =>
          this.router
            .navigate(['/confirmation', this.space.id], {
              queryParams: { bookingId: response.data.id },
            })
            .finally(() => {
              this.submitting = false;
              this.form.enable({ emitEvent: false });
              this.changeDetector.markForCheck();
            }),
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.error?.error?.message ??
            'Prenotazione non riuscita. Riprova.';
          this.submitting = false;
          this.form.enable({ emitEvent: false });
          this.changeDetector.markForCheck();
        },
      });
  }
}
