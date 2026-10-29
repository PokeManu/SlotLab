import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Client for the public password recovery flow. */
@Injectable({ providedIn: 'root' })
export class PasswordRecoveryApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/auth/forgot-password`;

  request(email: string): Observable<void> {
    return this.http.post<void>(this.url, { email });
  }
}
