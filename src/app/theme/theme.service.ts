import { Injectable, signal } from '@angular/core';
export type AppTheme = 'dark' | 'light';
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly transitionDuration = 1000;
  private transitionTimer?: ReturnType<typeof setTimeout>;
  private readonly currentTheme = signal<AppTheme>(this.readStoredTheme());
  readonly theme = this.currentTheme.asReadonly();
  constructor() {
    this.apply(this.currentTheme());
  }
  toggle(): void {
    const theme: AppTheme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    const changeTheme = () => {
      this.currentTheme.set(theme);
      this.apply(theme);
    };
    const prefersReducedMotion = this.prefersReducedMotion();
    if (
      !prefersReducedMotion &&
      typeof document.startViewTransition === 'function'
    ) {
      document.startViewTransition(changeTheme);
    } else {
      if (!prefersReducedMotion) this.startTransition();
      changeTheme();
    }
    try {
      localStorage.setItem('slotlab-theme', theme);
    } catch {}
  }
  private startTransition(): void {
    const root = document.documentElement;
    if (this.transitionTimer) clearTimeout(this.transitionTimer);
    root.classList.add('slotlab-theme-transition');
    this.transitionTimer = setTimeout(() => {
      root.classList.remove('slotlab-theme-transition');
      this.transitionTimer = undefined;
    }, this.transitionDuration);
  }
  private prefersReducedMotion(): boolean {
    return (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
  private readStoredTheme(): AppTheme {
    try {
      const stored = localStorage.getItem('slotlab-theme');
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {}
    return 'dark';
  }
  private apply(theme: AppTheme): void {
    document.documentElement.dataset['theme'] = theme;
    document.documentElement.classList.toggle(
      'ion-palette-dark',
      theme === 'dark',
    );
  }
}
