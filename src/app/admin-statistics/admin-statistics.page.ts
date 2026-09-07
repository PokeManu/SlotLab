import { AdminSidebarComponent } from '../admin-parts/admin-sidebar.component';
import { Auth } from '../auth/auth';
 import { Component, inject } from '@angular/core';
    import { IonContent, IonIcon } from '@ionic/angular';
  import { addIcons } from 'ionicons';

  import {
    barChartOutline,
    businessOutline,
    calendarOutline,
    checkboxOutline,
    chevronDownOutline,
    constructOutline,
    ellipsisVerticalOutline,
    gridOutline
  } from 'ionicons/icons';

  interface StatisticMetric {
    label: string;
    value: string;
    trend: string;
  }

  interface DailyBooking {
    day: number;
    value: number;
  }

  interface UsageCategory {
    label: string;
    percentage: number;
    color: 'blue' | 'green' | 'orange';
  }

  @Component({
    selector: 'app-admin-statistics',
    templateUrl: './admin-statistics.page.html',
    styleUrls: ['./admin-statistics.page.scss'],
    imports: [AdminSidebarComponent, IonContent, IonIcon]
  })
  export class AdminStatisticsPage {
  readonly auth = inject(Auth);

    readonly metrics: StatisticMetric[] = [
      {
        label: 'Prenotazioni',
        value: '1.248',
        trend: '+15% rispetto a lug 2026'
      },
      {
        label: 'Tasso di utilizzo',
        value: '72%',
        trend: '+6% rispetto a lug 2026'
      },
      {
        label: 'Check-in completati',
        value: '89%',
        trend: '+8% rispetto a lug 2026'
      }
    ];

    readonly dailyBookings: DailyBooking[] = [
      { day: 1, value: 72 },
      { day: 2, value: 50 },
      { day: 3, value: 38 },
      { day: 4, value: 44 },
      { day: 5, value: 36 },
      { day: 6, value: 48 },
      { day: 7, value: 53 },
      { day: 8, value: 49 },
      { day: 9, value: 37 },
      { day: 10, value: 43 },
      { day: 11, value: 78 },
      { day: 12, value: 44 },
      { day: 13, value: 72 },
      { day: 14, value: 52 },
      { day: 15, value: 71 },
      { day: 16, value: 58 },
      { day: 17, value: 45 },
      { day: 18, value: 50 },
      { day: 19, value: 50 },
      { day: 20, value: 34 },
      { day: 21, value: 50 },
      { day: 22, value: 75 },
      { day: 23, value: 63 },
      { day: 24, value: 53 },
      { day: 25, value: 60 },
      { day: 26, value: 80 },
      { day: 27, value: 48 },
      { day: 28, value: 33 },
      { day: 29, value: 45 },
      { day: 30, value: 75 },
      { day: 31, value: 48 }
    ];

    readonly usageCategories: UsageCategory[] = [
      {
        label: 'Aule studio',
        percentage: 48,
        color: 'blue'
      },
      {
        label: 'Laboratori',
        percentage: 32,
        color: 'green'
      },
      {
        label: 'Sale riunioni',
        percentage: 20,
        color: 'orange'
      }
    ];

    constructor() {
      addIcons({
        barChartOutline,
        businessOutline,
        calendarOutline,
        checkboxOutline,
        chevronDownOutline,
        constructOutline,
        ellipsisVerticalOutline,
        gridOutline
      });
    }
  }
