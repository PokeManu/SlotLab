import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {ActivatedRoute,RouterLink,} from '@angular/router';
import {IonContent, IonIcon,} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
    bookOutline,
    checkmarkOutline,
    locationOutline,
    peopleOutline,
    qrCodeOutline,
    timeOutline,
  } from 'ionicons/icons';
import {findSpace, Space,} from '../data/spaces.data';

@Component({
  selector: 'app-confirmation',
  templateUrl: './confirmation.page.html',
  styleUrls: ['./confirmation.page.scss'],
  imports: [IonContent, IonIcon, RouterLink,]
})
export class ConfirmationPage implements OnInit{
  space: Space;
  selectedTime = '10:00-12:00';
  participants = 4;
  selectedResource = 'Nessuna';
  bookingCode = ''
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  showQrCode = false;

  constructor(
    private activatedRoute: ActivatedRoute,
  ){
    const spaceId = this.activatedRoute.snapshot.paramMap.get('id');
    this.space = findSpace(spaceId);
    this.selectedTime = this.activatedRoute.snapshot.queryParamMap.get('time',) ?? '10:00-12:00';
    const participantsParameter = this.activatedRoute.snapshot.queryParamMap.get('participants',);
    this.participants=Number(participantsParameter) || 4;
    this.selectedResource = this.activatedRoute.snapshot.queryParamMap.get('resource',) ?? 'Nessuna';

          addIcons({
        bookOutline,
        checkmarkOutline,
        locationOutline,
        peopleOutline,
        qrCodeOutline,
        timeOutline,
      });
   }

   ngOnInit(): void {
    const bookingId = this.activatedRoute.snapshot.queryParamMap.get('bookingId');
    if (!bookingId) return;
    this.bookingCode = bookingId;
    this.changeDetector.markForCheck();
    this.http.get<{ data: { id: number; spaceName: string; date: string; startTime: string; endTime: string; participants: unknown[] } }>(`${environment.apiUrl}/bookings/${bookingId}`)
      .subscribe({ next: response => {
        const booking = response.data;
        this.bookingCode = String(booking.id);
        this.selectedTime = `${booking.startTime}-${booking.endTime}`;
        this.participants = booking.participants.length;
        this.changeDetector.markForCheck();
      }, error: () => this.changeDetector.markForCheck() });
   }

   toggleQrCode():void{
    this.showQrCode = !this.showQrCode;
   }

}
