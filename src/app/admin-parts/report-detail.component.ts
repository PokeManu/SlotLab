import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AdminReportsApi, AdminReport } from '../api/admin-reports-api';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
} from '@angular/core';
import {
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  locationOutline,
  personOutline,
  calendarOutline,
  imageOutline,
  chevronDownOutline,
} from 'ionicons/icons';
@Component({
  selector: 'app-report-detail',
  imports: [IonButton, IonIcon, IonSelect, IonSelectOption, IonSpinner],
  templateUrl: './report-detail.component.html',
  styleUrls: ['./report-detail.component.scss'],
})
export class ReportDetailComponent implements OnChanges, OnDestroy {
  private readonly reportsApi = inject(AdminReportsApi);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private photoRequest?: Subscription;
  photoUrl = '';
  photoError = '';
  photoLoading = false;
  @Input({ required: true })
  selectedReport!: AdminReport;
  @Input()
  savingStatus = false;
  @Output()
  statusChange = new EventEmitter<string>();
  pendingStatus: AdminReport['status'] = 'open';
  constructor() {
    addIcons({
      locationOutline,
      personOutline,
      calendarOutline,
      imageOutline,
      chevronDownOutline,
    });
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['selectedReport']) return;
    this.pendingStatus = this.selectedReport?.status ?? 'open';
    this.clearPhoto();
    this.photoError = '';
    this.photoLoading = Boolean(this.selectedReport?.photoPath);
    if (!this.photoLoading) return;
    this.photoRequest = this.reportsApi
      .photo(this.selectedReport.id)
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
    if (
      this.savingStatus ||
      !['open', 'in-progress', 'resolved'].includes(value)
    ) {
      return;
    }
    this.statusChange.emit(value);
  }
}
