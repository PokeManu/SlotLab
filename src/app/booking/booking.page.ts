import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
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
  findSpace,
  Space,
}from '../data/spaces.data'

@Component({
  selector: 'app-booking',
  templateUrl: './booking.page.html',
  styleUrls: ['./booking.page.scss'],
  imports: [IonContent, IonIcon, RouterLink, FormsModule]
})
export class BookingPage implements OnInit{
  space: Space;
  participants = 1;
  selectedTime = '';
  selectedResource="Nessuna";
  selectedDate = new Date().toISOString().slice(0, 10);
  participantEmailsText = '';
  errorMessage = '';
  submitting = false;
  selectedAvailabilityId: number | null = null;
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  @ViewChild('datePicker') private datePicker?: ElementRef<HTMLInputElement>;

  timeSlots: Array<{ id: number; label: string }> = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
  ) {
    const spaceId=this.activatedRoute.snapshot.paramMap.get('id');
    this.space = findSpace(spaceId);

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
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    if (!id || !/^\d+$/.test(id)) return;
    this.http.get<{ data: { id: number; name: string; building: { name: string }; floor: number; type: string; capacity: number; accessible: boolean; services: string[] } }>(`${environment.apiUrl}/spaces/${id}`)
      .subscribe({ next: response => {
        const value = response.data;
        this.space = { id: String(value.id), name: value.name, type: value.type, building: value.building.name,
          floor: value.floor, seats: value.capacity, accessible: value.accessible, image: '', services: value.services };
        this.loadAvailability(id);
        this.changeDetector.markForCheck();
      }, error: () => this.changeDetector.markForCheck() });
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
    this.timeSlots = [];
    this.selectedAvailabilityId = null;
    this.selectedTime = '';
    this.http.get<{ data: Array<{ availabilityId: number; startTime: string; endTime: string; availableSeats: number; bookable: boolean }> }>(`${environment.apiUrl}/spaces/${spaceId}/availability?date=${this.selectedDate}`)
      .subscribe({ next: availability => {
        this.timeSlots = availability.data.filter(slot => slot.bookable).map(slot => ({ id: slot.availabilityId, label: `${slot.startTime}-${slot.endTime}` }));
        this.selectedAvailabilityId = this.timeSlots[0]?.id ?? null;
        this.selectedTime = this.timeSlots[0]?.label ?? '';
        this.changeDetector.markForCheck();
      }, error: () => this.changeDetector.markForCheck() });
  }

  selectTime(time: { id: number; label: string }): void{
    this.selectedTime = time.label;
    this.selectedAvailabilityId = time.id;
  }

  decreaseParticipants(): void{
    if(this.participants > 1){
      this.participants--;
    }
  }

  increaseParticipants():void{
    if(this.participants < this.space.seats){
      this.participants++;
    }
  }

  changeResource(event: Event):void{
    const selectElement = event.target as HTMLSelectElement;
    this.selectedResource = selectElement.value;
  }

  confirmBooking(): void{
    if (!this.selectedAvailabilityId || !/^\d+$/.test(this.space.id) || this.submitting) return;
    this.errorMessage = '';
    this.submitting = true;
    const participantEmails = this.participantEmailsText.split(/[\s,;]+/).map(email => email.trim().toLowerCase()).filter(Boolean);
    this.http.post<{ data: { id: number } }>(`${environment.apiUrl}/bookings`, {
      spaceId: Number(this.space.id), date: this.selectedDate, availabilityId: this.selectedAvailabilityId, participantEmails,
    }, { headers: { 'Idempotency-Key': crypto.randomUUID() } }).subscribe({ next: response => this.router.navigate(['/confirmation', this.space.id], {
      queryParams: { bookingId: response.data.id, time: this.selectedTime, participants: this.participants, resource: this.selectedResource },
    }).finally(() => { this.submitting = false; }), error: (error: HttpErrorResponse) => {
      this.errorMessage = error.error?.error?.message ?? 'Prenotazione non riuscita. Riprova.';
      this.submitting = false;
    } });
  }
}
