import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Auth } from './auth';
import { SKIP_AUTH_REFRESH } from './http-context';
import { loginDestination } from './return-url';
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (
    !request.url.startsWith(`${environment.apiUrl}/`) ||
    request.url.startsWith(`${environment.apiUrl}/auth/`)
  )
    return next(request);
  const auth = inject(Auth);
  const router = inject(Router);
  const token = auth.accessToken;
  const sessionVersion = auth.sessionVersion;
  const authorized = (value: string | null) =>
    value
      ? request.clone({ setHeaders: { Authorization: `Bearer ${value}` } })
      : request;
  if (request.context.get(SKIP_AUTH_REFRESH)) return next(request);
  return next(authorized(token)).pipe(
    catchError((error) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        auth.signingOut() ||
        sessionVersion !== auth.sessionVersion
      ) {
        return throwError(() => error);
      }
      const retry = () =>
        next(authorized(auth.accessToken)).pipe(
          catchError((retryError) => {
            if (
              retryError instanceof HttpErrorResponse &&
              retryError.status === 401 &&
              sessionVersion === auth.sessionVersion
            ) {
              auth.invalidate();
              void router.navigateByUrl(loginDestination(router, router.url), {
                replaceUrl: true,
              });
            }
            return throwError(() => retryError);
          }),
        );
      if (auth.accessToken && auth.accessToken !== token) return retry();
      return auth.recoverSession().pipe(
        catchError((refreshError) => {
          if (
            refreshError instanceof HttpErrorResponse &&
            refreshError.status === 401
          ) {
            void router.navigateByUrl(loginDestination(router, router.url), {
              replaceUrl: true,
            });
          }
          return throwError(() => refreshError);
        }),
        switchMap(retry),
      );
    }),
  );
};
