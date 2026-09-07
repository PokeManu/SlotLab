import { ReportDetailComponent } from '../admin-parts/report-detail.component';
import { AdminSidebarComponent } from '../admin-parts/admin-sidebar.component';
import { Auth } from '../auth/auth';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
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
    wifiOutline
  } from 'ionicons/icons';

type ReportPriority = 'high' | 'medium' | 'low';
type ReportStatus = 'open' | 'in-progress' | 'resolved';
type ReportFilter = 'all' | ReportStatus;

export interface AdminReport{
  id: number;
  title: string;
  space: string;
  date: string;
  reporter: string;
  description: string;
  priority: ReportPriority;
  priorityLabel: string;
  status: ReportStatus;
  statusLabel: string;
  assignee: string;
  icon: string;
  attachment?:{
    name: string;
    size: string;
  }
}

@Component({
  selector: 'app-admin-reports',
  templateUrl: './admin-reports.page.html',
  styleUrls: ['./admin-reports.page.scss'],
  imports: [ReportDetailComponent, AdminSidebarComponent, IonContent, IonIcon]
})
export class AdminReportsPage implements OnInit{
  readonly auth = inject(Auth);
  private readonly http = inject(HttpClient);

  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly reports: AdminReport[] = [];
  errorMessage = '';
  statusMessage = '';
  statusError = '';
  savingStatus = false;

  activeFilter: ReportFilter = 'all';
  selectedReport: AdminReport | undefined;

  get filteredReports(): AdminReport[]{
    if(this.activeFilter === 'all'){
      return this.reports;
    }

    return this.reports.filter((report) => report.status === this.activeFilter);
  } 

  setFilter(filter: ReportFilter):void {
    this.activeFilter = filter;
  }

  selectReport(report: AdminReport): void {
    this.selectedReport = report;
  }

  updateStatus(status: string): void {
    if (!this.selectedReport || !['in-progress', 'resolved'].includes(status) || this.savingStatus) return;
    const apiStatus = status === 'in-progress' ? 'in_progress' : 'resolved';
    this.savingStatus = true;
    this.statusMessage = '';
    this.statusError = '';
    this.http.patch<{ data: { status: string } }>(`${environment.apiUrl}/admin/reports/${this.selectedReport.id}/status`, { status: apiStatus }).subscribe({
      next: () => {
        if (this.selectedReport) {
          this.selectedReport.status = status as ReportStatus;
          this.selectedReport.statusLabel = status === 'in-progress' ? 'In lavorazione' : 'Risolta';
        }
        this.savingStatus = false;
        this.statusMessage = 'Aggiornamento salvato.';
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.savingStatus = false;
        const message = error.error?.error?.message;
        this.statusError = typeof message === 'string' ? message : `Salvataggio non riuscito (HTTP ${error.status}).`;
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
        wifiOutline
      });
  }

  ngOnInit(): void {
    this.http.get<{ data: Array<{ id: number; spaceName: string; category: string; description: string; priority: ReportPriority; status: string; authorEmail: string; createdAt: string }> }>(`${environment.apiUrl}/admin/reports`).subscribe({ next: response => {
      const reports = response.data.map(report => ({ id: report.id, title: report.category, space: report.spaceName,
        date: new Date(report.createdAt).toLocaleDateString('it-IT'), reporter: report.authorEmail, description: report.description,
        priority: report.priority, priorityLabel: report.priority === 'high' ? 'Alta' : report.priority === 'medium' ? 'Media' : 'Bassa',
        status: report.status === 'in_progress' ? 'in-progress' : report.status as ReportStatus, statusLabel: report.status === 'in_progress' ? 'In lavorazione' : report.status === 'open' ? 'Aperta' : 'Risolta',
        assignee: '—', icon: 'warning-outline' }));
      this.reports.splice(0, this.reports.length, ...reports);
      this.selectedReport = this.reports[0];
      this.changeDetector.markForCheck();
    }, error: () => {
      this.errorMessage = 'Non è stato possibile caricare le segnalazioni.';
      this.changeDetector.markForCheck();
    } });
  }

}
