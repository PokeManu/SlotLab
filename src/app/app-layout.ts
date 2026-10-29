import type { UserRole } from './auth/auth';

export type AppLayout = 'user' | 'admin' | 'fullscreen';

const userSections = new Set([
  '/home',
  '/spaces',
  '/bookings',
  '/favorites',
  '/notifications',
  '/reports',
  '/profile',
]);

export function appLayoutFor(url: string, role: UserRole | null): AppLayout {
  const path = url.split(/[?#]/, 1)[0].replace(/\/$/, '') || '/';

  if (role === 'admin' && (path === '/profile' || /^\/admin(?:\/|$)/.test(path))) {
    return 'admin';
  }

  if (role === 'user' && userSections.has(path)) {
    return 'user';
  }

  return 'fullscreen';
}
