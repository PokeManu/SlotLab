import { Component, inject } from '@angular/core';
import { Auth } from './auth/auth';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
  styles: ['.session-notice { position: fixed; z-index: 10000; bottom: 80px; left: 16px; right: 16px; padding: 16px; background: #14233b; color: #ffe0a0; border: 1px solid #314764; border-radius: 12px; }'],
})
export class AppComponent {
  readonly auth = inject(Auth);
  constructor() {}
}
