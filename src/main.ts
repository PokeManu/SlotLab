import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { inject, provideAppInitializer, isDevMode } from '@angular/core';
import { Auth } from './app/auth/auth';
import { authInterceptor } from './app/auth/auth-interceptor';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { slotLabPageTransition } from './app/animations/page-transition.animation';
import { provideServiceWorker } from '@angular/service-worker';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(() => firstValueFrom(inject(Auth).restore())),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({ navAnimation: slotLabPageTransition }),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()), provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          }),
  ],
});
