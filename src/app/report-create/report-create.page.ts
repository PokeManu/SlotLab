import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  locationOutline,
} from 'ionicons/icons';
import { Space } from '../data/spaces.data';
import { ReportCategory } from '../models/space-report.model';
@Component({
  selector: 'app-report-create',
  templateUrl: './report-create.page.html',
  styleUrls: ['./report-create.page.scss'],
  imports: [FormsModule, IonContent, IonIcon, RouterLink],
})
export class ReportCreatePage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly spaceId: string | null;
  space: Space;
  category: ReportCategory | '' = '';
  description = '';
  photo?: File;
  submitted = false;
  sending = false;
  error = '';
  constructor() {
    const spaceId = this.activatedRoute.snapshot.paramMap.get('spaceId');
    this.spaceId = spaceId;
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
      arrowBackOutline,
      checkmarkCircleOutline,
      locationOutline,
    });
  }
  ngOnInit(): void {
    if (!this.spaceId || !/^\d+$/.test(this.spaceId)) return;
    this.http
      .get<{
        data: {
          id: number;
          name: string;
          building: {
            name: string;
          };
          floor: number;
          type: string;
          capacity: number;
          accessible: boolean;
          services: string[];
        };
      }>(`${environment.apiUrl}/spaces/${this.spaceId}`)
      .subscribe({
        next: (response) => {
          const value = response.data;
          this.space = {
            id: String(value.id),
            name: value.name,
            type:
              value.type === 'study_room'
                ? 'Aula studio'
                : value.type === 'laboratory'
                  ? 'Laboratorio'
                  : 'Sala riunioni',
            building: value.building.name,
            floor: value.floor,
            seats: value.capacity,
            accessible: value.accessible,
            image: '',
            services: value.services,
          };
          this.changeDetector.markForCheck();
        },
        error: () => this.changeDetector.markForCheck(),
      });
  }
  submitReport(): void {
    if (this.sending) return;
    this.error = '';
    if (!this.category || this.description.trim().length < 10) {
      return;
    }
    if (!this.spaceId || !/^\d+$/.test(this.spaceId)) {
      this.error = 'Lo spazio selezionato non è valido.';
      return;
    }
    const form = new FormData();
    form.append(
      'category',
      this.category === 'equipment' ? 'technical' : this.category,
    );
    form.append('description', this.description.trim());
    if (this.photo) form.append('photo', this.photo, this.photo.name);
    this.sending = true;
    this.http
      .post(`${environment.apiUrl}/spaces/${this.spaceId}/reports`, form)
      .subscribe({
        next: () => {
          this.sending = false;
          this.submitted = true;
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.sending = false;
          this.error =
            'Invio non riuscito. Controlla la connessione e riprova.';
          this.changeDetector.markForCheck();
        },
      });
  }
  selectPhoto(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (
      file.size > 5 * 1024 * 1024 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    ) {
      this.photo = undefined;
      this.error = 'La foto deve essere JPEG, PNG o WebP e non superare 5 MB.';
      return;
    }
    this.error = '';
    this.photo = file;
  }
}
