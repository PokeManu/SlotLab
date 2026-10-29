import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

export interface CheckInResult {
  result: string;
  message: string;
  checkedInAt: string;
}

export interface CheckInResponse {
  data: CheckInResult;
}

/** Client for the QR check-in endpoint used by the presence flow. */
@Injectable({ providedIn: 'root' })
export class CheckInApi {
  private readonly http = inject(HttpClient);

  verify(spaceId: string) {
    return this.http.post<CheckInResponse>(
      `${environment.apiUrl}/spaces/${spaceId}/check-in`,
      {},
    );
  }
}
