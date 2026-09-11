import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { IonContent } from '@ionic/angular';
import { SpaceReport } from '../models/space-report.model';
import { MobileNavigationComponent } from '../mobile-navigation/mobile-navigation.component';
import { ReportListItemComponent } from '../report-list-item/report-list-item.component';
import { TopbarComponent } from '../topbar-component/topbar-component.component';
@Component({
  selector: 'app-reports',
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss'],
  imports: [
    IonContent,
    TopbarComponent,
    ReportListItemComponent,
    MobileNavigationComponent,
  ],
})
export class ReportsPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  reports: SpaceReport[] = [];
  ngOnInit(): void {
    this.loadReports();
  }
  ionViewDidEnter(): void {
    this.loadReports();
  }
  private loadReports(): void {
    this.http
      .get<{
        data: Array<{
          id: number;
          spaceId: number;
          spaceName: string;
          category: string;
          description: string;
          createdAt: string;
          photo?: string | null;
          status: string;
        }>;
      }>(`${environment.apiUrl}/reports`)
      .subscribe({
        next: (response) => {
          this.reports = response.data.map((report) => ({
            id: String(report.id),
            photo: report.photo,
            spaceId: String(report.spaceId),
            spaceName: report.spaceName,
            building: '',
            floor: 0,
            category:
              report.category === 'technical'
                ? 'equipment'
                : (report.category as SpaceReport['category']),
            description: report.description,
            dateLabel: new Date(report.createdAt).toLocaleDateString('it-IT', {
              timeZone: 'Europe/Rome',
            }),
            status:
              report.status === 'open'
                ? 'submitted'
                : report.status === 'in_progress'
                  ? 'in-progress'
                  : 'resolved',
          }));
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.reports = [];
          this.changeDetector.markForCheck();
        },
      });
  }
}
