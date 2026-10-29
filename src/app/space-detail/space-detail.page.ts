import { SpacesApi } from '../api/spaces-api';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  accessibilityOutline,
  alertCircleOutline,
  arrowBackOutline,
  checkmarkCircleOutline,
  easelOutline,
  desktopOutline,
  snowOutline,
  flashOutline,
  locationOutline,
  peopleOutline,
  wifiOutline,
} from 'ionicons/icons';
import { Space } from '../data/spaces.data';
@Component({
  selector: 'app-space-detail',
  templateUrl: './space-detail.page.html',
  styleUrls: ['./space-detail.page.scss'],
  imports: [IonButton, IonCard, IonCardContent, IonContent, IonIcon, IonSpinner, RouterLink],
})
export class SpaceDetailPage implements OnInit, OnDestroy {
  space: Space;
  readonly serviceDetails: Record<
    string,
    {
      label: string;
      icon: string;
    }
  > = {
    wifi: { label: 'Wi-Fi', icon: 'wifi-outline' },
    power_outlets: { label: 'Prese elettriche', icon: 'flash-outline' },
    projector: { label: 'Proiettore', icon: 'easel-outline' },
    computer: { label: 'Computer', icon: 'desktop-outline' },
    air_conditioning: { label: 'Aria condizionata', icon: 'snow-outline' },
  };
  availableToday = false;
  availableSeats: number | null = null;
  availableTime = '';
  loadingAvailability = false;
  availabilityError = '';
  spaceStatus: 'active' | 'maintenance' | 'deactivated' = 'active';
  backPath = '/spaces';
  backLabel = 'Torna agli spazi';
  private requests = new Subscription();
  ngOnDestroy(): void {
    this.requests.unsubscribe();
  }
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private hasEntered = false;
  error = '';
  ionViewWillEnter(): void {
    if (this.hasEntered) this.ngOnInit();
    this.hasEntered = true;
  }
  private readonly spacesApi = inject(SpacesApi);
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
    const origin = this.activatedRoute.snapshot.queryParamMap?.get('from');
    if (origin === 'home') {
      this.backPath = '/home';
      this.backLabel = 'Torna alla home';
    } else if (origin === 'favorites') {
      this.backPath = '/favorites';
      this.backLabel = 'Torna ai preferiti';
    }
    addIcons({
      accessibilityOutline,
      alertCircleOutline,
      arrowBackOutline,
      checkmarkCircleOutline,
      easelOutline,
      desktopOutline,
      snowOutline,
      flashOutline,
      locationOutline,
      peopleOutline,
      wifiOutline,
    });
  }
  ngOnInit(): void {
    this.requests.unsubscribe();
    this.requests = new Subscription();
    this.availableSeats = null;
    this.availableTime = '';
    this.availableToday = false;
    this.availabilityError = '';
    this.spaceStatus = 'active';
    this.error = '';
    this.loadingAvailability = true;
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    if (!id || !/^\d+$/.test(id)) return;
    this.requests.add(
      this.spacesApi
        .detail(id)
        .subscribe({
          next: ({ space, status }) => {
            this.space = space;
            this.spaceStatus = status;
            if (this.spaceStatus !== 'active') {
              this.loadingAvailability = false;
              this.changeDetector.markForCheck();
              return;
            }
            const today = new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Europe/Rome',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).format(new Date());
            this.requests.add(
              this.spacesApi
                .availability(id, today)
                .subscribe({
                  next: (slots) => {
                    const firstSlot = slots.find(
                      (slot) => slot.bookable,
                    );
                    this.availableToday = Boolean(firstSlot);
                    this.availableSeats = firstSlot?.availableSeats ?? 0;
                    this.availableTime = firstSlot
                      ? `${firstSlot.startTime}–${firstSlot.endTime}`
                      : '';
                    this.loadingAvailability = false;
                    this.changeDetector.markForCheck();
                  },
                  error: () => {
                    this.loadingAvailability = false;
                    this.availabilityError =
                      'Impossibile verificare i posti disponibili. Riapri il dettaglio per riprovare.';
                    this.changeDetector.markForCheck();
                  },
                }),
            );
            this.changeDetector.markForCheck();
          },
          error: () => {
            this.error = 'Impossibile caricare lo spazio.';
            this.loadingAvailability = false;
            this.changeDetector.markForCheck();
          },
        }),
    );
  }
  openBooking(): void {
    this.router.navigate(['/booking', this.space.id]);
  }
  openReport(): void {
    this.router.navigate(['/reports', 'new', this.space.id]);
  }
}
