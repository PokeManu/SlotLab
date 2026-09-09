import { ChangeDetectorRef, Component, OnInit, OnDestroy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { bookOutline, checkmarkOutline, locationOutline, peopleOutline, timeOutline } from 'ionicons/icons';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-confirmation', templateUrl: './confirmation.page.html', styleUrls: ['./confirmation.page.scss'],
  imports: [IonContent, IonIcon, RouterLink],
})
export class ConfirmationPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private request?: Subscription;
  private hasEntered = false;
  booking: { id: number; spaceId: number; spaceName: string; building: string; floor: number; date: string; startTime: string; endTime: string; participants: unknown[] } | null = null;
  loading = false;
  error = '';
  constructor() { addIcons({ bookOutline, checkmarkOutline, locationOutline, peopleOutline, timeOutline }); }
  ngOnInit(): void { this.load(); }
  ionViewWillEnter(): void { if (this.hasEntered) this.load(); this.hasEntered = true; }
  ngOnDestroy(): void { this.request?.unsubscribe(); }
  load(): void {
    this.request?.unsubscribe();
    this.booking = null;
    const id = this.route.snapshot.queryParamMap.get('bookingId');
    this.error = '';
    if (!id || !/^[1-9]\d*$/.test(id)) { this.error = 'Prenotazione non specificata.'; return; }
    this.loading = true;
    this.request = this.http.get<{ data: NonNullable<ConfirmationPage['booking']> }>(`${environment.apiUrl}/bookings/${id}`).subscribe({
      next: response => { this.booking = response.data; this.loading = false; this.changeDetector.markForCheck(); },
      error: () => { this.loading = false; this.error = 'Impossibile caricare la prenotazione.'; this.changeDetector.markForCheck(); },
    });
  }
  get dateLabel(): string { return this.booking ? new Date(`${this.booking.date}T12:00:00Z`).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' }) : ''; }
}
