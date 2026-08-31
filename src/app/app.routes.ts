import { Routes } from '@angular/router';
import {adminGuard} from './auth/admin-guard';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'admin/spaces',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin-spaces/admin-spaces.page').then(
        (m) => m.AdminSpacesPage
      ),
  },
  {
    path: 'admin/reports',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin-reports/admin-reports.page').then(
        (m) => m.AdminReportsPage
      ),
  },
  {
    path: 'admin/bookings',
    loadComponent: () =>
      import('./admin-bookings/admin-bookings.page').then(
        (m) => m.AdminBookingsPage,
      ),
  },
  {
    path: 'admin/statistics',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin-statistics/admin-statistics.page').then(
        (m) => m.AdminStatisticsPage
      ),
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
