import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {
  ActivatedRoute,
  Router,
  RouterLink,
}from '@angular/router';

import {
  IonContent,
  IonIcon,
}from '@ionic/angular';

import{addIcons} from 'ionicons';

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

import{
  Space,
}from '../data/spaces.data'

@Component({
  selector: 'app-booking',
  templateUrl: './booking.page.html',
  styleUrls: ['./booking.page.scss'],
  imports: [IonContent, IonIcon, RouterLink, FormsModule]
})
export class BookingPage implements OnInit, OnDestroy{
  space: Space;
  get participants(): number { return 1 + this.participantEmailsText.split(/[\s,;]+/).filter(Boolean).length; }
  selectedTime = '';
  selectedDate = new Date().toISOString().slice(0, 10);
  participantEmailsText = '';
  errorMessage = '';
  submitting = false;
  private lastRequest = '';
  private requestKey = '';
  selectedAvailabilityId: number | null = null;
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  @ViewChild('datePicker') private datePicker?: ElementRef<HTMLInputElement>;

  private hasEntered = false;
  private spaceRequest?: Subscription;
  private availabilityRequest?: Subscription;
  loadingAvailability = false;
  availabilityError = '';

  timeSlots: Array<{ id: number; label: string }> = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
  ) {
    const spaceId=this.activatedRoute.snapshot.paramMap.get('id');
    this.space = { id: spaceId ?? '', name: '', type: '', building: '', floor: 0, seats: 0, accessible: false, image: '', services: [] };

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

  ngOnInit(): void { this.loadSpace(); }

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
    this.spaceRequest = this.http.get<{ data: { id: number; name: string; building: { name: string }; floor: number; type: string; capacity: number; accessible: boolean; services: string[] } }>(`${environment.apiUrl}/spaces/${id}`)
      .subscribe({ next: response => {
        const value = response.data;
        this.space = { id: String(value.id), name: value.name, type: value.type, building: value.building.name,
          floor: value.floor, seats: value.capacity, accessible: value.accessible, image: '', services: value.services };
        this.loadAvailability(id);
        this.changeDetector.markForCheck();
      }, error: () => {
        this.loadingAvailability = false;
        this.availabilityError = 'Impossibile caricare lo spazio. Riapri la pagina per riprovare.';
        this.changeDetector.markForCheck();
      } });
  }

  changeDate(): void {
    if (/^\d+$/.test(this.space.id)) this.loadAvailability(this.space.id);
  }

  openDatePicker(): void {
    const picker = this.datePicker?.nativeElement;
    if (!picker) return;
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
  }

  private loadAvailability(spaceId: string): void {
    this.availabilityRequest?.unsubscribe();
    this.loadingAvailability = true;
    this.availabilityError = '';
    this.changeDetector.markForCheck();
    this.timeSlots = [];
    this.selectedAvailabilityId = null;
    this.selectedTime = '';
    this.availabilityRequest = this.http.get<{ data: Array<{ availabilityId: number; startTime: string; endTime: string; availableSeats: number; bookable: boolean }> }>(`${environment.apiUrl}/spaces/${spaceId}/availability?date=${this.selectedDate}`)
      .subscribe({ next: availability => {
        this.loadingAvailability = false;
        this.timeSlots = availability.data.filter(slot => slot.bookable).map(slot => ({ id: slot.availabilityId, label: `${slot.startTime}-${slot.endTime}` }));
        this.selectedAvailabilityId = this.timeSlots[0]?.id ?? null;
        this.selectedTime = this.timeSlots[0]?.label ?? '';
        this.changeDetector.markForCheck();
      }, error: () => {
        this.loadingAvailability = false;
        this.availabilityError = 'Impossibile caricare le fasce. Seleziona nuovamente la data per riprovare.';
        this.changeDetector.markForCheck();
      } });
  }

  selectTime(time: { id: number; label: string }): void{
    this.selectedTime = time.label;
    this.selectedAvailabilityId = time.id;
  }

  get durationLabel(): string {
    if (!this.selectedTime) return 'Seleziona una fascia';
    const [start, end] = this.selectedTime.split('-').map(time => {
      const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes;
    });
    return `${end - start} minuti`;
  }

  confirmBooking(): void{
    if (!this.selectedAvailabilityId || !/^\d+$/.test(this.space.id) || this.submitting) return;
    this.errorMessage = '';
    this.submitting = true;
    const participantEmails = this.participantEmailsText.split(/[\s,;]+/).map(email => email.trim().toLowerCase()).filter(Boolean);
    const body = {
      spaceId: Number(this.space.id), date: this.selectedDate, availabilityId: this.selectedAvailabilityId, participantEmails,
    };
    const serialized = JSON.stringify(body);
    if (serialized !== this.lastRequest) { this.lastRequest = serialized; this.requestKey = crypto.randomUUID(); }
    this.http.post<{ data: { id: number } }>(`${environment.apiUrl}/bookings`, body, { headers: { 'Idempotency-Key': this.requestKey } }).subscribe({ next: response => this.router.navigate(['/confirmation', this.space.id], {
      queryParams: { bookingId: response.data.id },
    }).finally(() => { this.submitting = false; this.changeDetector.markForCheck(); }), error: (error: HttpErrorResponse) => {
      this.errorMessage = error.error?.error?.message ?? 'Prenotazione non riuscita. Riprova.';
      this.submitting = false;
      this.changeDetector.markForCheck();
    } });
  }
}
