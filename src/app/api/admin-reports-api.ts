import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';

export type AdminReportPriority = 'high' | 'medium' | 'low';
export type AdminReportStatus = 'open' | 'in-progress' | 'resolved';

export interface AdminReport {
  id: number;
  title: string;
  space: string;
  date: string;
  reporter: string;
  description: string;
  priority: AdminReportPriority;
  priorityLabel: string;
  status: AdminReportStatus;
  statusLabel: string;
  assignee: string;
  icon: string;
  photoPath?: string | null;
  attachment?: {
    name: string;
    size: string;
  };
}

interface AdminReportDto {
  id: number;
  spaceName: string;
  category: string;
  description: string;
  priority: AdminReportPriority;
  status: string;
  authorEmail: string;
  photoPath?: string | null;
  createdAt: string;
}

interface AdminReportsResponse {
  data: AdminReportDto[];
}

@Injectable({ providedIn: 'root' })
export class AdminReportsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/admin/reports`;

  list() {
    return this.http
      .get<AdminReportsResponse>(this.url)
      .pipe(map(({ data }) => data.map((report) => this.mapReport(report))));
  }

  updateStatus(id: number, status: AdminReportStatus) {
    const apiStatus = status === 'in-progress' ? 'in_progress' : status;
    return this.http.patch<{ data: { status: string } }>(
      `${this.url}/${id}/status`,
      { status: apiStatus },
    );
  }

  photo(id: number) {
    return this.http.get(`${this.url}/${id}/photo`, {
      responseType: 'blob',
    });
  }

  private mapReport(report: AdminReportDto): AdminReport {
    const status =
      report.status === 'in_progress'
        ? 'in-progress'
        : (report.status as AdminReportStatus);
    return {
      id: report.id,
      title: report.category,
      space: report.spaceName,
      date: new Date(report.createdAt).toLocaleDateString('it-IT', {
        timeZone: 'Europe/Rome',
      }),
      reporter: report.authorEmail,
      description: report.description,
      priority: report.priority,
      priorityLabel:
        report.priority === 'high'
          ? 'Alta'
          : report.priority === 'medium'
            ? 'Media'
            : 'Bassa',
      status,
      statusLabel:
        status === 'in-progress'
          ? 'In lavorazione'
          : status === 'open'
            ? 'Aperta'
            : 'Risolta',
      photoPath: report.photoPath,
      assignee: '—',
      icon: 'warning-outline',
    };
  }
}
