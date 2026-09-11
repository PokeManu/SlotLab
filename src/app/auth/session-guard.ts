import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';
import { loginDestination, returnDestination } from './return-url';
export function requirePage(access: string | undefined, url: string) {
  const auth = inject(Auth);
  const router = inject(Router);
  if (!auth.user()) return loginDestination(router, url);
  if ((access === 'admin' || access === 'user') && auth.role !== access) {
    return router.parseUrl(auth.homePath);
  }
  return true;
}
export const sessionGuard: CanActivateFn = (route, state) => {
  return requirePage(route.data?.['access'], state.url);
};
export const guestGuard: CanActivateFn = (route) => {
  const auth = inject(Auth);
  const router = inject(Router);
  if (!auth.user()) return true;
  return (
    returnDestination(
      router,
      route.queryParamMap?.get('returnUrl'),
      auth.role,
    ) ?? router.parseUrl(auth.homePath)
  );
};
