import { Component, OnInit } from '@angular/core';
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
export class ConfirmationPage{
  space: Space;
  selectedTime = '10:00-12:00';
  participants = 4;
  selectedResource = 'Nessuna';
  bookingCode = 'SL-4821'
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

   toggleQrCode():void{
    this.showQrCode = !this.showQrCode;
   }

}
