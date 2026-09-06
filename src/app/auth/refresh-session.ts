import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, defer, finalize, map, of, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RefreshedSession {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

@Injectable({ providedIn: 'root' })
export class RefreshSession {
  private readonly http = inject(HttpClient);
  private pending?: Observable<RefreshedSession>;
  private pendingLogout?: Observable<void>;

  refresh(): Observable<RefreshedSession> {
    // La scelta avviene alla sottoscrizione, anche se refresh() e chiamato prima.
    return defer(() => {
      if (this.pendingLogout) return throwError(() => new Error('Logout in corso.'));
      if (!this.pending) {
        this.pending = this.http.post<{ data: RefreshedSession }>(
          `${environment.apiUrl}/auth/refresh`, {},
          { withCredentials: true, headers: { 'X-SlotLab-Request': '1' } },
        ).pipe(
          map(response => response.data),
          finalize(() => { this.pending = undefined; }),
          // Non interrompere una rotazione gia partita se un componente si scollega.
          shareReplay({ bufferSize: 1, refCount: false }),
        );
      }
      return this.pending;
    });
  }

  logout(): Observable<void> {
    return defer(() => {
      if (!this.pendingLogout) {
        // Attendere la risposta del refresh permette di inviare il cookie appena ruotato.
        const refreshCompleted: Observable<RefreshedSession | null> = this.pending ?? of(null);
        this.pendingLogout = refreshCompleted.pipe(
          catchError(() => of(null)),
          switchMap(() => this.http.post<void>(`${environment.apiUrl}/auth/logout`, {}, {
            withCredentials: true, headers: { 'X-SlotLab-Request': '1' },
          })),
          finalize(() => { this.pendingLogout = undefined; }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
      }
      return this.pendingLogout;
    });
  }
}
