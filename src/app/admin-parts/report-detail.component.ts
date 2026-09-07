import { Component, Input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { locationOutline, personOutline, calendarOutline, imageOutline, chevronDownOutline } from 'ionicons/icons';
import type { AdminReport } from '../admin-reports/admin-reports.page';

@Component({ selector: 'app-report-detail', imports: [IonIcon],
  templateUrl: './report-detail.component.html', styleUrls: ['./report-detail.component.scss'] })
export class ReportDetailComponent {
  @Input({ required: true }) selectedReport!: AdminReport;
  constructor() { addIcons({ locationOutline, personOutline, calendarOutline, imageOutline, chevronDownOutline }); }
}
