import { ReportDetailComponent } from '../admin-parts/report-detail.component';
import {
  AdminReportsApi,
  AdminReport,
  AdminReportStatus,
} from '../api/admin-reports-api';
import { Auth } from '../auth/auth';
import {
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { Subscription } from 'rxjs';
import {
  barChartOutline,
  bulbOutline,
  businessOutline,
  calendarOutline,
  checkboxOutline,
  chevronDownOutline,
  constructOutline,
  gridOutline,
  imageOutline,
  locationOutline,
  personOutline,
  volumeHighOutline,
  warningOutline,
  wifiOutline,
} from 'ionicons/icons';
type ReportFilter = 'all' | AdminReportStatus;
@Component({
  selector: 'app-admin-reports',
  templateUrl: './admin-reports.page.html',
  styleUrls: ['./admin-reports.page.scss'],
  imports: [
    ReportDetailComponent,
    IonButton,
    IonContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
  ],
})
export class AdminReportsPage implements OnInit, OnDestroy {
  readonly auth = inject(Auth);
  private readonly reportsApi = inject(AdminReportsApi);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private request?: Subscription;
  readonly reports: AdminReport[] = [];
  loading = false;
  errorMessage = '';
  statusMessage = '';
  statusError = '';
  savingStatus = false;
  private hasEntered = false;
  activeFilter: ReportFilter = 'all';
  selectedReport: AdminReport | undefined;
  get filteredReports(): AdminReport[] {
    if (this.activeFilter === 'all') {
      return this.reports;
    }
    return this.reports.filter((report) => report.status === this.activeFilter);
  }
  setFilter(filter: unknown): void {
    if (
      filter === 'all' ||
      filter === 'open' ||
      filter === 'in-progress' ||
      filter === 'resolved'
    ) {
      this.activeFilter = filter;
      if (!this.selectedReport || !this.filteredReports.includes(this.selectedReport)) {
        this.selectedReport = this.filteredReports[0];
      }
      this.statusMessage = '';
      this.statusError = '';
    }
  }
  selectReport(report: AdminReport): void {
    this.selectedReport = report;
    this.statusMessage = '';
    this.statusError = '';
  }
  updateStatus(status: string): void {
    if (
      !this.selectedReport ||
      !['in-progress', 'resolved'].includes(status) ||
      this.savingStatus
    )
      return;
    const report = this.selectedReport;
    this.savingStatus = true;
    this.statusMessage = '';
    this.statusError = '';
    this.reportsApi
      .updateStatus(report.id, status as AdminReportStatus)
      .subscribe({
        next: () => {
          report.status = status as AdminReportStatus;
          report.statusLabel =
            status === 'in-progress' ? 'In lavorazione' : 'Risolta';
          this.savingStatus = false;
          this.statusMessage = 'Aggiornamento salvato.';
          if (!this.selectedReport || !this.filteredReports.includes(this.selectedReport)) {
            this.selectedReport = this.filteredReports[0];
          }
          this.changeDetector.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.savingStatus = false;
          const message = error.error?.error?.message;
          this.statusError =
            typeof message === 'string'
              ? message
              : `Salvataggio non riuscito (HTTP ${error.status}).`;
          this.changeDetector.markForCheck();
        },
      });
  }
  constructor() {
    addIcons({
      barChartOutline,
      bulbOutline,
      businessOutline,
      calendarOutline,
      checkboxOutline,
      chevronDownOutline,
      constructOutline,
      gridOutline,
      imageOutline,
      locationOutline,
      personOutline,
      volumeHighOutline,
      warningOutline,
      wifiOutline,
    });
  }
  ngOnInit(): void {
    this.loadReports();
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }
  ionViewWillEnter(): void {
    if (this.hasEntered) this.loadReports();
    this.hasEntered = true;
  }
  loadReports(): void {
    this.request?.unsubscribe();
    this.loading = true;
    this.errorMessage = '';
    this.reports.splice(0, this.reports.length);
    this.selectedReport = undefined;
    this.changeDetector.markForCheck();
    this.request = this.reportsApi
      .list()
      .subscribe({
        next: (response) => {
          this.reports.splice(0, this.reports.length, ...response);
          this.selectedReport = this.filteredReports[0];
          this.loading = false;
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.reports.splice(0, this.reports.length);
          this.selectedReport = undefined;
          this.errorMessage = 'Non è stato possibile caricare le segnalazioni.';
          this.changeDetector.markForCheck();
        },
      });
  }
}
