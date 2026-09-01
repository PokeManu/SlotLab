import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular';

import { SPACE_REPORTS } from '../data/space-reports.data';

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
export class ReportsPage {
  readonly reports = SPACE_REPORTS;
}