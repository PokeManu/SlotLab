import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';

import {
  IonContent,
  IonIcon,
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  accessibilityOutline,
  alertCircleOutline,
  arrowBackOutline,
  checkmarkCircleOutline,
  easelOutline,
  flashOutline,
  locationOutline,
  peopleOutline,
  wifiOutline,
} from 'ionicons/icons';

import {
  findSpace,
  Space,
} from '../data/spaces.data';

@Component({
  selector: 'app-space-detail',
  templateUrl: './space-detail.page.html',
  styleUrls: ['./space-detail.page.scss'],
  imports: [
    IonContent,
    IonIcon,
    RouterLink,
  ],
})
export class SpaceDetailPage implements OnInit {
  space: Space;
  availableToday = false;
  private readonly http = inject(HttpClient);

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
  ) {
    const spaceId =
      this.activatedRoute.snapshot.paramMap.get('id');

    this.space = findSpace(spaceId);

    addIcons({
      accessibilityOutline,
      alertCircleOutline,
      arrowBackOutline,
      checkmarkCircleOutline,
      easelOutline,
      flashOutline,
      locationOutline,
      peopleOutline,
      wifiOutline,
    });
  }

  ngOnInit(): void {
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    if (!id || !/^\d+$/.test(id)) return;
    this.http.get<{ data: { id: number; name: string; building: { name: string }; floor: number; type: string; capacity: number; accessible: boolean; status: string; services: string[] } }>(
      `${environment.apiUrl}/spaces/${id}`,
    ).subscribe({ next: response => {
      const value = response.data;
      this.space = { id: String(value.id), name: value.name,
        type: value.type === 'study_room' ? 'Aula studio' : value.type === 'laboratory' ? 'Laboratorio' : 'Sala riunioni',
        building: value.building.name, floor: value.floor, seats: value.capacity,
        accessible: value.accessible, image: '', services: value.services };
      const today = new Date().toISOString().slice(0, 10);
      this.http.get<{ data: Array<{ bookable: boolean }> }>(`${environment.apiUrl}/spaces/${id}/availability?date=${today}`)
        .subscribe({ next: availability => { this.availableToday = availability.data.some(slot => slot.bookable); } });
    }});
  }

  openBooking(): void {
    this.router.navigate([
      '/booking',
      this.space.id,
    ]);
  }

  openReport(): void {
    this.router.navigate([
      '/reports',
      'new',
      this.space.id,
    ]);
  }
}
