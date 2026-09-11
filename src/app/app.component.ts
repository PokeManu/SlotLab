import { Component, effect, inject } from '@angular/core';
import { Auth } from './auth/auth';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { ThemeService } from './theme/theme.service';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, switchMap } from 'rxjs';
import { ProfilePhoto } from './profile/profile-photo';
import { NotificationState } from './notifications/notification-state';
import { NavigationEnd, Router } from '@angular/router';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
  styles: [
    '.session-notice { position: fixed; z-index: 10000; bottom: 80px; left: 16px; right: 16px; padding: 16px; background: #14233b; color: #ffe0a0; border: 1px solid #314764; border-radius: 12px; }',
  ],
})
export class AppComponent {
  readonly auth = inject(Auth);
  readonly theme = inject(ThemeService);
  private readonly updates = inject(SwUpdate, { optional: true });
  private readonly profilePhoto = inject(ProfilePhoto);
  private readonly notificationState = inject(NotificationState);
  private readonly router = inject(Router);
  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (!user) {
        this.notificationState.set(0);
        return;
      }
      this.profilePhoto.load(user.id).subscribe({ error: () => {} });
      if (user.role === 'user') this.notificationState.refresh();
      else this.notificationState.set(0);
    });
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.auth.user()?.role === 'user') this.notificationState.refresh();
      });
    if (!this.updates?.isEnabled) return;
    this.updates.versionUpdates
      .pipe(
        filter(
          (event): event is VersionReadyEvent => event.type === 'VERSION_READY',
        ),
        switchMap(() => this.updates!.activateUpdate()),
      )
      .subscribe(() => window.location.reload());
  }
}
