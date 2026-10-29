import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { IonContent } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ReportsApi } from '../api/reports-api';
import { SpaceReport } from '../models/space-report.model';
import { ReportListItemComponent } from '../report-list-item/report-list-item.component';
@Component({
  selector: 'app-reports',
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss'],
  imports: [IonContent, ReportListItemComponent],
})
export class ReportsPage implements OnInit, OnDestroy {
  private readonly reportsApi = inject(ReportsApi);
  private readonly changeDetector = inject(ChangeDetectorRef);
  reports: SpaceReport[] = [];
  private request?: Subscription;
  private hasEntered = false;
  ngOnInit(): void {
    this.loadReports();
  }
  ionViewDidEnter(): void {
    if (this.hasEntered) this.loadReports();
    this.hasEntered = true;
  }
  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }
  private loadReports(): void {
    this.request?.unsubscribe();
    this.request = this.reportsApi.list().subscribe({
      next: (reports) => {
        this.reports = reports;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.reports = [];
        this.changeDetector.markForCheck();
      },
    });
  }
}
