import { PRIMARY_OUTLET, Router, UrlTree } from '@angular/router';
import type { UserRole } from './auth';

// Accettiamo solo pagine riservate note, mai URL esterni o schermate di accesso.
export function returnDestination(router: Router, value: unknown, role?: UserRole | null): UrlTree | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') ||
      /[\\\s]/.test(value)) return null;
  try {
    const tree = router.parseUrl(value);
    const primary = tree.root.children[PRIMARY_OUTLET];
    if (!primary || Object.keys(tree.root.children).length !== 1 || Object.keys(primary.children).length) return null;
    const segments = primary.segments;
    if (segments.some(segment => Object.keys(segment.parameters).length || !/^[\w-]+$/.test(segment.path))) return null;
    const route = router.config.find(candidate => {
      if (!candidate.data?.['access']) return false;
      const parts = candidate.path?.split('/') ?? [];
      return parts.length === segments.length && parts.every((part, index) =>
        part.startsWith(':') || part === segments[index].path);
    });
    if (!route || (role && route.data?.['access'] !== 'authenticated' && route.data?.['access'] !== role)) return null;
    if (segments[0].path === 'check-in' && !/^[1-9]\d*$/.test(segments[1]?.path ?? '')) return null;
    return tree;
  } catch {
    return null;
  }
}

export function loginDestination(router: Router, attemptedUrl: string): UrlTree {
  const destination = returnDestination(router, attemptedUrl);
  return router.createUrlTree(['/login'], {
    queryParams: destination ? { returnUrl: router.serializeUrl(destination) } : {},
  });
}
