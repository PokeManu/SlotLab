import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, finalize } from 'rxjs';
import { IonContent } from '@ionic/angular';

import { AdminSidebarComponent } from '../admin-parts/admin-sidebar.component';
import { Auth } from '../auth/auth';
import { environment } from '../../environments/environment';

interface StatisticMetric {
  label: string;
  value: string;
  trend: string;
}

interface DailyBooking {
  date: string;
  day: string;
  value: number;
  heightPercent: number;
}

interface UsageCategory {
  label: string;
  percentage: number;
  color: 'blue' | 'green' | 'orange';
}

interface StatisticsData {
  dateFrom: string;
  dateTo: string;
  bookings: number;
  participants: number;
  presences: number;
  absences: number;
  offeredCapacity: number;
  utilizationRate: number | null;
  checkInRate: number | null;
  daily: Array<{ date: string; bookings: number }>;
  usage: Array<{ type: string; presences: number; percentage: number }>;
  mostBookedSpaces: Array<{ spaceId: number; spaceName: string; bookings: number; participants: number; presences: number }>;
  mostUsedSlots: Array<{ startTime: string; endTime: string; bookings: number; participants: number; presences: number }>;
  reportsByCategory: Array<{ category: string; count: number }>;
  reportsByStatus: Array<{ status: string; count: number }>;
  history: {
    trackingStartedAt: string | null;
    complete: boolean;
    excludedBookings: number;
    ambiguousOccurrences?: number;
    gapOccurrences?: number;
  };
}

interface StatisticsResponse {
  data: StatisticsData;
}

@Component({
  selector: 'app-admin-statistics',
  templateUrl: './admin-statistics.page.html',
  styleUrls: ['./admin-statistics.page.scss'],
  imports: [AdminSidebarComponent, IonContent],
})
export class AdminStatisticsPage implements OnInit {
  readonly auth = inject(Auth);
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private request?: Subscription;
  private loadSequence = 0;
  private hasEntered = false;

  dateFrom = this.startOfCurrentRomeMonth();
  dateTo = this.currentRomeDate();
  rangeError = '';
  loading = false;
  error = '';
  statistics: StatisticsData | null = null;
  metrics: StatisticMetric[] = this.emptyMetrics();
  dailyBookings: DailyBooking[] = [];
  usageCategories: UsageCategory[] = [];
  mostBookedSpaces: StatisticsData['mostBookedSpaces'] = [];
  mostUsedSlots: StatisticsData['mostUsedSlots'] = [];
  reportsByCategory: StatisticsData['reportsByCategory'] = [];
  reportsByStatus: StatisticsData['reportsByStatus'] = [];
  usageGradient = 'conic-gradient(#334155 0 100%)';
  chartDescription = 'Nessuna prenotazione nel periodo selezionato';
  historyMessage = '';

  ngOnInit(): void {
    this.loadStatistics();
  }

  ionViewDidEnter(): void {
    if (this.hasEntered) this.loadStatistics();
    this.hasEntered = true;
  }

  changeDate(field: 'from' | 'to', value: string): void {
    if (field === 'from') this.dateFrom = value;
    else this.dateTo = value;
    this.rangeError = this.validateRange();
    this.changeDetector.markForCheck();
  }

  applyPeriod(): void {
    this.rangeError = this.validateRange();
    if (!this.rangeError) this.loadStatistics();
  }

  retry(): void {
    this.loadStatistics();
  }

  get rangeIsValid(): boolean {
    return Boolean(this.dateFrom && this.dateTo && !this.validateRange());
  }

  get hasData(): boolean {
    const data = this.statistics;
    if (!data) return false;
    return data.bookings > 0 || data.participants > 0 || data.presences > 0
      || data.offeredCapacity > 0 || data.daily.length > 0
      || data.reportsByCategory.some(item => item.count > 0)
      || data.reportsByStatus.some(item => item.count > 0);
  }

  get chartTicks(): DailyBooking[] {
    if (this.dailyBookings.length <= 7) return this.dailyBookings;
    const step = (this.dailyBookings.length - 1) / 6;
    return Array.from({ length: 7 }, (_, index) => this.dailyBookings[Math.round(index * step)]);
  }

  get chartScale(): number[] {
    const max = Math.max(1, ...this.dailyBookings.map(item => item.value));
    return [max, Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0];
  }

  get usageAriaLabel(): string {
    return this.usageCategories.length
      ? this.usageCategories.map(item => `${item.label} ${item.percentage}%`).join(', ')
      : 'Nessun utilizzo registrato';
  }

  reportCategoryLabel(category: string): string {
    return { technical: 'Tecniche', accessibility: 'Accessibilità', cleanliness: 'Pulizia', other: 'Altro' }[category] ?? category;
  }

  reportStatusLabel(status: string): string {
    return { open: 'Aperte', in_progress: 'In lavorazione', resolved: 'Risolte' }[status] ?? status;
  }

  loadStatistics(): void {
    this.rangeError = this.validateRange();
    if (this.rangeError) return;

    const sequence = ++this.loadSequence;
    this.request?.unsubscribe();
    this.loading = true;
    this.error = '';
    this.statistics = null;
    this.metrics = this.emptyMetrics();
    this.dailyBookings = [];
    this.usageCategories = [];
    this.mostBookedSpaces = [];
    this.mostUsedSlots = [];
    this.reportsByCategory = [];
    this.reportsByStatus = [];
    this.usageGradient = 'conic-gradient(#334155 0 100%)';
    this.historyMessage = '';
    this.changeDetector.markForCheck();

    const query = `?dateFrom=${encodeURIComponent(this.dateFrom)}&dateTo=${encodeURIComponent(this.dateTo)}`;
    this.request = this.http.get<StatisticsResponse>(`${environment.apiUrl}/admin/statistics${query}`).pipe(
      finalize(() => {
        if (sequence === this.loadSequence) {
          this.loading = false;
          this.changeDetector.markForCheck();
        }
      }),
    ).subscribe({
      next: response => {
        if (sequence !== this.loadSequence) return;
        this.statistics = this.normalise(response.data);
        this.dateFrom = this.statistics.dateFrom;
        this.dateTo = this.statistics.dateTo;
        this.updateView(this.statistics);
        this.changeDetector.markForCheck();
      },
      error: () => {
        if (sequence !== this.loadSequence) return;
        this.error = 'Impossibile caricare le statistiche. Riprova.';
        this.changeDetector.markForCheck();
      },
    });
  }

  private updateView(data: StatisticsData): void {
    const ambiguousOccurrences = data.history.ambiguousOccurrences ?? 0;
    const gapOccurrences = data.history.gapOccurrences ?? 0;
    const historyHasIssues = ambiguousOccurrences > 0 || gapOccurrences > 0;
    this.metrics = [
      { label: 'Prenotazioni', value: String(data.bookings), trend: 'gruppi completati' },
      { label: 'Tasso di utilizzo', value: this.rate(historyHasIssues ? null : data.utilizationRate), trend: historyHasIssues ? 'posti storici non determinabili' : 'presenze / posti offerti' },
      { label: 'Check-in completati', value: this.rate(data.checkInRate), trend: 'presenze / partecipanti' },
    ];
    const max = Math.max(0, ...data.daily.map(item => item.bookings));
    this.dailyBookings = data.daily.map(item => ({
      date: item.date,
      day: item.date.slice(-2),
      value: item.bookings,
      heightPercent: max ? (item.bookings / max) * 100 : 0,
    }));
    this.chartDescription = this.dailyBookings.length
      ? `Prenotazioni giornaliere dal ${data.dateFrom} al ${data.dateTo}`
      : 'Nessuna prenotazione nel periodo selezionato';
    const labels: Record<string, { label: string; color: UsageCategory['color'] }> = {
      study_room: { label: 'Aule studio', color: 'blue' },
      laboratory: { label: 'Laboratori', color: 'green' },
      meeting_room: { label: 'Sale riunioni', color: 'orange' },
    };
    this.usageCategories = data.usage.flatMap(item => labels[item.type]
      ? [{ ...labels[item.type], percentage: item.percentage }]
      : []);
    this.usageGradient = this.makeUsageGradient(this.usageCategories);
    this.mostBookedSpaces = data.mostBookedSpaces;
    this.mostUsedSlots = data.mostUsedSlots;
    this.reportsByCategory = data.reportsByCategory;
    this.reportsByStatus = data.reportsByStatus;
    const historyNotes: string[] = [];
    if (!data.history.complete) {
      const since = data.history.trackingStartedAt
        ? new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' }).format(new Date(data.history.trackingStartedAt))
        : 'questa installazione';
      historyNotes.push(`i dati precedenti a ${since} potrebbero mancare; gli indicatori si riferiscono alle sole fasce documentate`);
    }
    if (data.history.excludedBookings > 0) {
      historyNotes.push(`${data.history.excludedBookings} prenotazioni escluse`);
    }
    if (historyHasIssues) {
      historyNotes.push(`${ambiguousOccurrences} fasce ambigue e ${gapOccurrences} fasce mancanti; i posti offerti non sono determinabili per queste fasce`);
    }
    this.historyMessage = historyNotes.length ? `Storia parziale: ${historyNotes.join('; ')}.` : '';
  }

  private normalise(data: StatisticsData): StatisticsData {
    return {
      ...data,
      daily: data.daily ?? [], usage: data.usage ?? [],
      mostBookedSpaces: data.mostBookedSpaces ?? [], mostUsedSlots: data.mostUsedSlots ?? [],
      reportsByCategory: data.reportsByCategory ?? [], reportsByStatus: data.reportsByStatus ?? [],
      history: data.history ?? { trackingStartedAt: null, complete: false, excludedBookings: 0 },
    };
  }

  private emptyMetrics(): StatisticMetric[] {
    return [
      { label: 'Prenotazioni', value: '0', trend: 'nessun dato caricato' },
      { label: 'Tasso di utilizzo', value: 'N/D', trend: 'nessun posto offerto' },
      { label: 'Check-in completati', value: 'N/D', trend: 'nessun partecipante' },
    ];
  }

  private rate(value: number | null): string {
    return value === null ? 'N/D' : `${value}%`;
  }

  private validateRange(): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(this.dateTo)) {
      return 'Inserisci due date valide.';
    }
    return this.dateFrom > this.dateTo ? 'La data iniziale deve precedere quella finale.' : '';
  }

  private makeUsageGradient(categories: UsageCategory[]): string {
    if (!categories.length || categories.every(item => item.percentage <= 0)) return 'conic-gradient(#334155 0 100%)';
    const colors = { blue: '#4f7fff', green: '#67c9a7', orange: '#ffb84f' };
    let cursor = 0;
    const stops = categories.map(item => {
      const next = Math.min(100, cursor + Math.max(0, item.percentage));
      const value = `${colors[item.color]} ${cursor}% ${next}%`;
      cursor = next;
      return value;
    });
    if (cursor < 100) stops.push(`#334155 ${cursor}% 100%`);
    return `conic-gradient(${stops.join(', ')})`;
  }

  private currentRomeDate(): string {
    return this.formatRomeDate(new Date());
  }

  private startOfCurrentRomeMonth(): string {
    return `${this.currentRomeDate().slice(0, 7)}-01`;
  }

  private formatRomeDate(date: Date): string {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
}
