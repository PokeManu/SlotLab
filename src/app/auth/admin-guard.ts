import { CanActivateFn } from '@angular/router';
import { requirePage } from './session-guard';
export const adminGuard: CanActivateFn = (_route, state) =>
  requirePage('admin', state.url);
