import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ChangeDetectorRef,
  OnChanges,
  OnDestroy,
  inject,
  Component,
  Input,
} from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  accessibilityOutline,
  buildOutline,
  ellipsisHorizontalOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { SpaceReport } from '../models/space-report.model';
@Component({
  selector: 'app-report-list-item',
  templateUrl: './report-list-item.component.html',
  styleUrls: ['./report-list-item.component.scss'],
  imports: [IonIcon],
})
export class ReportListItemComponent implements OnChanges, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private photoRequest?: Subscription;
  photoUrl = '';
  photoError = '';
  photoLoading = false;
  @Input({ required: true })
  report!: SpaceReport;
  constructor() {
    addIcons({
      accessibilityOutline,
      buildOutline,
      ellipsisHorizontalOutline,
      sparklesOutline,
    });
  }
  ngOnChanges(): void {
    this.clearPhoto();
    this.photoError = '';
    this.photoLoading = Boolean(this.report?.photo);
    if (!this.photoLoading) return;
    this.photoRequest = this.http
      .get(`${environment.apiUrl}/reports/${this.report.id}/photo`, {
        responseType: 'blob',
      })
      .subscribe({
        next: (photo) => {
          this.photoUrl = URL.createObjectURL(photo);
          this.photoLoading = false;
          this.changeDetector.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.photoError =
            error.status === 0
              ? 'Server non raggiungibile. Riprova.'
              : `Non è stato possibile caricare la foto allegata (HTTP ${error.status}).`;
          this.photoLoading = false;
          this.changeDetector.markForCheck();
        },
      });
  }
  private clearPhoto(): void {
    this.photoRequest?.unsubscribe();
    if (this.photoUrl) URL.revokeObjectURL(this.photoUrl);
    this.photoUrl = '';
  }
  ngOnDestroy(): void {
    this.clearPhoto();
  }
  get categoryLabel(): string {
    switch (this.report.category) {
      case 'equipment':
        return 'Attrezzatura';
      case 'cleaning':
        return 'Pulizia';
      case 'accessibility':
        return 'Accessibilità';
      case 'other':
        return 'Altro';
    }
  }
  get statusLabel(): string {
    switch (this.report.status) {
      case 'submitted':
        return 'Inviata';
      case 'in-progress':
        return 'In gestione';
      case 'resolved':
        return 'Risolta';
    }
  }
  get categoryIcon(): string {
    switch (this.report.category) {
      case 'equipment':
        return 'build-outline';
      case 'cleaning':
        return 'sparkles-outline';
      case 'accessibility':
        return 'accessibility-outline';
      case 'other':
        return 'ellipsis-horizontal-outline';
    }
  }
}
