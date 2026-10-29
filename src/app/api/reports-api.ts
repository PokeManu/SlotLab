import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ReportCategory, SpaceReport } from '../models/space-report.model';

interface ReportDto {
  id: number;
  spaceId: number;
  spaceName: string;
  category: string;
  description: string;
  createdAt: string;
  photo?: string | null;
  status: string;
}

export interface NewReport {
  category: ReportCategory;
  description: string;
  photo?: File;
}

@Injectable({ providedIn: 'root' })
export class ReportsApi {
  private readonly http = inject(HttpClient);

  list() {
    return this.http
      .get<{ data: ReportDto[] }>(`${environment.apiUrl}/reports`)
      .pipe(map((response) => response.data.map((report) => this.summary(report))));
  }

  create(spaceId: string, report: NewReport) {
    const body = new FormData();
    body.append(
      'category',
      report.category === 'equipment' ? 'technical' : report.category,
    );
    body.append('description', report.description.trim());
    if (report.photo) body.append('photo', report.photo, report.photo.name);
    return this.http.post(`${environment.apiUrl}/spaces/${spaceId}/reports`, body);
  }

  photo(id: string) {
    return this.http.get(`${environment.apiUrl}/reports/${id}/photo`, {
      responseType: 'blob',
    });
  }

  private summary(report: ReportDto): SpaceReport {
    return {
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
    };
  }
}
