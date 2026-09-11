import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  OnDestroy,
  inject,
} from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  locationOutline,
  personOutline,
  calendarOutline,
  imageOutline,
  chevronDownOutline,
} from 'ionicons/icons';
import type { AdminReport } from '../admin-reports/admin-reports.page';
@Component({
  selector: 'app-report-detail',
  imports: [IonIcon],
  templateUrl: './report-detail.component.html',
  styleUrls: ['./report-detail.component.scss'],
})
export class ReportDetailComponent implements OnChanges, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private photoRequest?: Subscription;
  photoUrl = '';
  photoError = '';
  photoLoading = false;
  @Input({ required: true })
  selectedReport!: AdminReport;
  @Output()
  statusChange = new EventEmitter<string>();
  constructor() {
    addIcons({
      locationOutline,
      personOutline,
      calendarOutline,
      imageOutline,
      chevronDownOutline,
    });
  }
  ngOnChanges(): void {
    this.clearPhoto();
    this.photoError = '';
    this.photoLoading = Boolean(this.selectedReport?.photoPath);
    if (!this.photoLoading) return;
    this.photoRequest = this.http
      .get(
        `${environment.apiUrl}/admin/reports/${this.selectedReport.id}/photo`,
        { responseType: 'blob' },
      )
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
  saveStatus(value: string): void {
    this.statusChange.emit(value);
  }
}
