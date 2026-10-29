import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';
import { environment } from '../../environments/environment';
import { Auth } from '../auth/auth';
@Injectable({ providedIn: 'root' })
export class ProfilePhoto {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);
  private readonly currentUrl = signal('');
  private loadedFor: number | null = null;
  private loading?: Observable<void>;
  readonly url = this.currentUrl.asReadonly();
  upload(userId: number, photo: File): Observable<void> {
    return this.http
      .put<void>(`${environment.apiUrl}/users/me/photo`, photo, {
        headers: { 'Content-Type': photo.type },
      })
      .pipe(
        tap(() => {
          if (this.auth.user()?.id === userId) this.update(userId, photo);
        }),
      );
  }
  delete(userId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/users/me/photo`).pipe(
      tap(() => {
        if (this.auth.user()?.id === userId) this.remove(userId);
      }),
    );
  }
  load(userId: number): Observable<void> {
    if (this.loadedFor === userId) return this.loading ?? of(undefined);
    this.clearUrl();
    this.loadedFor = userId;
    const request = this.http
      .get(`${environment.apiUrl}/users/me/photo`, { responseType: 'blob' })
      .pipe(
        tap((photo) => {
          if (this.loadedFor === userId) this.replaceUrl(photo);
        }),
        map(() => undefined),
        catchError((error) => {
          if (error instanceof HttpErrorResponse && error.status === 404)
            return of(undefined);
          if (this.loadedFor === userId) this.loadedFor = null;
          return throwError(() => error);
        }),
        finalize(() => {
          this.loading = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.loading = request;
    return request;
  }
  update(userId: number, photo: Blob): void {
    this.loadedFor = userId;
    this.replaceUrl(photo);
  }
  remove(userId: number): void {
    if (this.loadedFor === userId) this.clearUrl();
  }
  private replaceUrl(photo: Blob): void {
    this.clearUrl();
    this.currentUrl.set(URL.createObjectURL(photo));
  }
  private clearUrl(): void {
    const url = this.currentUrl();
    if (url) URL.revokeObjectURL(url);
    this.currentUrl.set('');
  }
}
