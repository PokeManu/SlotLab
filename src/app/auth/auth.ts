import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
} from '@angular/common/http';
import { Injectable, Injector, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  defer,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { environment } from '../../environments/environment';
import { RefreshSession } from './refresh-session';
import { SKIP_AUTH_REFRESH } from './http-context';
export type UserRole = 'admin' | 'user';
export interface Account {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}
export interface Credentials {
  email: string;
  password: string;
}
export interface Registration extends Credentials {
  firstName: string;
  lastName: string;
}
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly injector = inject(Injector);
  private readonly currentUser = signal<Account | null>(null);
  readonly user = this.currentUser.asReadonly();
  readonly notice = signal('');
  readonly signingOut = signal(false);
  private token: string | null = null;
  private generation = 0;
  private recovering?: Observable<Account>;
  private get http() {
    return this.injector.get(HttpClient);
  }
  private get session() {
    return this.injector.get(RefreshSession);
  }
  get accessToken() {
    return this.token;
  }
  get sessionVersion() {
    return this.generation;
  }
  get role(): UserRole | null {
    return this.user()?.role ?? null;
  }
  get initials() {
    return `${this.user()?.firstName[0] ?? ''}${this.user()?.lastName[0] ?? ''}`.toUpperCase();
  }
  get homePath() {
    return this.isAdmin() ? '/admin' : '/home';
  }
  isAdmin(): boolean {
    return this.role === 'admin';
  }
  register(input: Registration): Observable<Account> {
    return this.http
      .post<{
        data: Account;
      }>(`${environment.apiUrl}/auth/register`, input)
      .pipe(map((response) => response.data));
  }
  login(input: Credentials): Observable<Account> {
    return defer(() => {
      if (this.signingOut())
        return throwError(() => new Error('Operazione account in corso.'));
      const generation = ++this.generation;
      const recovery: Observable<Account | null> = this.recovering ?? of(null);
      return recovery.pipe(
        catchError(() => of(null)),
        switchMap(() =>
          this.http.post<{
            data: {
              accessToken: string;
              user: Account;
            };
          }>(`${environment.apiUrl}/auth/login`, input, {
            withCredentials: true,
          }),
        ),
        map((response) => {
          if (generation !== this.generation)
            throw new Error('Operazione superata.');
          this.token = response.data.accessToken;
          this.currentUser.set(response.data.user);
          this.notice.set('');
          return response.data.user;
        }),
      );
    });
  }
  recoverSession(): Observable<Account> {
    return defer(() => {
      if (this.signingOut())
        return throwError(() => new Error('Logout in corso.'));
      if (!this.recovering) {
        const generation = this.generation;
        this.recovering = this.session.refresh().pipe(
          switchMap((tokens) =>
            this.http
              .get<{
                data: Account;
              }>(`${environment.apiUrl}/users/me`, {
                headers: { Authorization: `Bearer ${tokens.accessToken}` },
                context: new HttpContext().set(SKIP_AUTH_REFRESH, true),
              })
              .pipe(
                map((response) => ({
                  user: response.data,
                  token: tokens.accessToken,
                })),
              ),
          ),
          map((result) => {
            if (generation !== this.generation)
              throw new Error('Operazione superata.');
            this.token = result.token;
            this.currentUser.set(result.user);
            this.notice.set('');
            return result.user;
          }),
          catchError((error) => {
            if (generation === this.generation) {
              if (error instanceof HttpErrorResponse && error.status === 401)
                this.invalidate();
              else
                this.notice.set(
                  'Connessione al server non disponibile. Riprova.',
                );
            }
            return throwError(() => error);
          }),
          finalize(() => {
            this.recovering = undefined;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
      }
      return this.recovering;
    });
  }
  restore(): Observable<Account | null> {
    return this.recoverSession().pipe(
      catchError((error) => {
        if (
          error instanceof HttpErrorResponse &&
          error.error?.error?.code === 'REFRESH_TOKEN_MISSING'
        ) {
          this.notice.set('');
        }
        return of(null);
      }),
    );
  }
  invalidate(): void {
    this.generation++;
    this.token = null;
    this.currentUser.set(null);
    this.notice.set(
      'La sessione è scaduta o è stata sostituita. Accedi di nuovo.',
    );
  }
  updateAccount(
    action: 'password' | 'delete',
    currentPassword: string,
    newPassword = '',
  ): Observable<void> {
    return defer(() => {
      if (this.signingOut())
        return throwError(() => new Error('Operazione account in corso.'));
      this.signingOut.set(true);
      const recovery: Observable<Account | null> = this.recovering ?? of(null);
      return recovery.pipe(
        switchMap(() => {
          this.generation++;
          const options = {
            context: new HttpContext().set(SKIP_AUTH_REFRESH, true),
            headers: { Authorization: `Bearer ${this.token}` },
            withCredentials: true,
          };
          return action === 'password'
            ? this.http.patch<void>(
                `${environment.apiUrl}/users/me/password`,
                { currentPassword, newPassword },
                options,
              )
            : this.http.delete<void>(`${environment.apiUrl}/users/me`, {
                ...options,
                body: { currentPassword },
              });
        }),
        tap(() => {
          this.token = null;
          this.currentUser.set(null);
          this.notice.set(
            action === 'password'
              ? 'Password modificata. Accedi con la nuova password.'
              : 'Account eliminato.',
          );
          void this.injector
            .get(Router)
            .navigateByUrl('/login', { replaceUrl: true });
        }),
        catchError((error) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.invalidate();
            void this.injector
              .get(Router)
              .navigateByUrl('/login', { replaceUrl: true });
          }
          return throwError(() => error);
        }),
        finalize(() => this.signingOut.set(false)),
      );
    });
  }
  logout(): Observable<void> {
    return defer(() => {
      if (this.signingOut()) return of(undefined);
      this.signingOut.set(true);
      this.generation++;
      return this.session.logout().pipe(
        tap(() => {
          this.token = null;
          this.currentUser.set(null);
          this.notice.set('');
          void this.injector
            .get(Router)
            .navigateByUrl('/login', { replaceUrl: true });
        }),
        catchError((error) => {
          this.notice.set(
            'Uscita non completata. Controlla la connessione e riprova.',
          );
          return throwError(() => error);
        }),
        finalize(() => this.signingOut.set(false)),
      );
    });
  }
}
