import { Routes } from '@angular/router';
import {adminGuard} from './auth/admin-guard';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin-dashboard/admin-dashboard.page').then((m) => m.AdminDashboardPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'spaces/:id',
    loadComponent: () =>
      import('./space-detail/space-detail.page').then(
        (m) => m.SpaceDetailPage
      ),
  },
  {
    path: 'booking/:id',
    loadComponent: () =>
      import('./booking/booking.page').then(
        (m) => m.BookingPage
      ),
  },
  {
    path: 'confirmation/:id',
    loadComponent: () =>
      import('./confirmation/confirmation.page').then(
        (m) => m.ConfirmationPage
      ),
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
