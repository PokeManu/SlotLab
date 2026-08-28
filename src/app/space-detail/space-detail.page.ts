import { Component } from '@angular/core';
import{
  ActivatedRoute,
  Router,
  RouterLink,
}from '@angular/router';

import{
  IonContent,
  IonIcon,
}from '@ionic/angular';

import {addIcons} from 'ionicons';

import{
  accessibilityOutline,
  arrowBackOutline,
  checkmarkCircleOutline,
  easelOutline,
  flashOutline,
  locationOutline,
  peopleOutline,
  wifiOutline,
}from 'ionicons/icons';

import{
  findSpace,
  Space,
}from '../data/spaces.data';

@Component({
  selector: 'app-space-detail',
  templateUrl: './space-detail.page.html',
  styleUrls: ['./space-detail.page.scss'],
  imports: [IonContent, IonIcon, RouterLink],
})
export class SpaceDetailPage{
  space: Space;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
  ){
    const spaceId= this.activatedRoute.snapshot.paramMap.get('id');
    this.space = findSpace(spaceId);

    addIcons({
      accessibilityOutline,
      arrowBackOutline,
      checkmarkCircleOutline,
      easelOutline,
      flashOutline,
      locationOutline,
      peopleOutline,
      wifiOutline,
    });
  }

  openBooking(): void{
    this.router.navigate([
      '/booking',
      this.space.id,
    ]);
  }
}
