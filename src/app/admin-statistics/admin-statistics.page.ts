import { AdminSidebarComponent } from '../admin-parts/admin-sidebar.component';
import { Auth } from '../auth/auth';
 import { Component, OnInit, inject } from '@angular/core';
 import { HttpClient } from '@angular/common/http';
 import { environment } from '../../environments/environment';
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
  export class AdminStatisticsPage implements OnInit {
  readonly auth = inject(Auth);
  private readonly http = inject(HttpClient);

    metrics: StatisticMetric[] = [
      {
        label: 'Prenotazioni',
        value: '0',
        trend: 'periodo selezionato'
      },
      {
        label: 'Tasso di utilizzo',
        value: '0%',
        trend: 'periodo selezionato'
      },
      {
        label: 'Check-in completati',
        value: '0%',
        trend: 'periodo selezionato'
      }
    ];

    dailyBookings: DailyBooking[] = [];

  usageCategories: UsageCategory[] = [];
  selectedPeriod = '2026-08';

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

    ngOnInit(): void { this.loadStatistics(); }

    changePeriod(value: string): void { this.selectedPeriod = value; this.loadStatistics(); }

    loadStatistics(): void {
      const [year, month] = this.selectedPeriod.split('-').map(Number);
      const from = `${this.selectedPeriod}-01`;
      const until = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
      this.http.get<{ data: { bookings: number; utilizationRate: number; checkInRate: number; daily: Array<{ date: string; bookings: number }>; usage: Array<{ type: string; percentage: number }> } }>(`${environment.apiUrl}/admin/statistics?from=${from}&until=${until}`)
        .subscribe({ next: response => {
          const data = response.data;
          this.metrics = [
            { label: 'Prenotazioni', value: String(data.bookings), trend: 'periodo selezionato' },
            { label: 'Tasso di utilizzo', value: `${data.utilizationRate}%`, trend: 'presenze / posti offerti' },
            { label: 'Check-in completati', value: `${data.checkInRate}%`, trend: 'presenze / partecipanti' },
          ];
          this.dailyBookings = data.daily.map(item => ({ day: Number(item.date.slice(-2)), value: item.bookings }));
          const labels: Record<string, { label: string; color: UsageCategory['color'] }> = { study_room: { label: 'Aule studio', color: 'blue' }, laboratory: { label: 'Laboratori', color: 'green' }, meeting_room: { label: 'Sale riunioni', color: 'orange' } };
          this.usageCategories = data.usage.flatMap(item => labels[item.type] ? [{ label: labels[item.type].label, color: labels[item.type].color, percentage: item.percentage }] : []);
        }, error: () => { this.dailyBookings = []; } });
    }
  }
