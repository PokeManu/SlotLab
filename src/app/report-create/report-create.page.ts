import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonSelect, IonSelectOption, IonSpinner, IonTextarea } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  locationOutline,
} from 'ionicons/icons';
import { Space } from '../data/spaces.data';
import { ReportCategory } from '../models/space-report.model';
import { ReportsApi } from '../api/reports-api';
import { SpacesApi } from '../api/spaces-api';
@Component({
  selector: 'app-report-create',
  templateUrl: './report-create.page.html',
  styleUrls: ['./report-create.page.scss'],
  imports: [FormsModule, IonButton, IonContent, IonIcon, IonSelect, IonSelectOption, IonSpinner, IonTextarea, RouterLink],
})
export class ReportCreatePage implements OnInit {
  private readonly reportsApi = inject(ReportsApi);
  private readonly spacesApi = inject(SpacesApi);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly spaceId: string | null;
  space: Space;
  category: ReportCategory | '' = '';
  description = '';
  photo?: File;
  submitted = false;
  sending = false;
  attemptedSubmit = false;
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
    this.spacesApi
      .detail(this.spaceId)
      .subscribe({
        next: ({ space }) => {
          // The report form does not render the preview image. Keep the
          // existing empty value while centralizing the DTO mapping in SpacesApi.
          this.space = { ...space, image: '' };
          this.changeDetector.markForCheck();
        },
        error: () => this.changeDetector.markForCheck(),
      });
  }
  submitReport(): void {
    if (this.sending) return;
    this.attemptedSubmit = true;
    this.error = '';
    if (
      !this.category ||
      this.description.trim().length < 10 ||
      this.description.trim().length > 500
    ) {
      return;
    }
    if (!this.spaceId || !/^\d+$/.test(this.spaceId)) {
      this.error = 'Lo spazio selezionato non è valido.';
      return;
    }
    this.sending = true;
    this.reportsApi
      .create(this.spaceId, {
        category: this.category,
        description: this.description,
        photo: this.photo,
      })
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
