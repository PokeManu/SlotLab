import { Component, resource } from '@angular/core';
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
  imports: [IonContent, IonIcon, RouterLink]
})
export class BookingPage{
  space: Space;
  participants = 4;
  selectedTime = '10:00-12:00';
  selectedResource="Nessuna";

  readonly timeSlots= [
    '09:00-10:00',
    '10:00-12:00',
    '12:00-14:00',
  ];

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

  selectTime(time: string): void{
    this.selectedTime = time;
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
    this.router.navigate(
    [
      '/confirmation',
      this.space.id,
    ],
    {
      queryParams: {
        time: this.selectedTime,
        participants: this.participants,
        resource: this.selectedResource,
      },
    },
  );
  }
}
