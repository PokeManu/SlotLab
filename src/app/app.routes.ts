import { Routes } from '@angular/router';
import {adminGuard} from './auth/admin-guard';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.page').then((m) => m.HomePage),
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
    path: 'spaces',
    loadComponent: () =>
      import('./spaces/spaces.page').then((m) => m.SpacesPage),
  },
  {
    path: 'spaces/:id',
    loadComponent: () =>
      import('./space-detail/space-detail.page').then(
        (m) => m.SpaceDetailPage
      ),
  },
  {
    path: 'bookings',
    loadComponent: () =>
      import('./bookings/bookings.page').then((m) => m.BookingsPage),
  },
  {
    path: 'favorites',
    loadComponent: () =>
      import('./favorites/favorites.page').then((m) => m.FavoritesPage),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./profile/profile.page').then((m) => m.ProfilePage),
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
    path: 'notifications',
    loadComponent: () =>
      import('./notifications/notifications.page').then(
        (m) => m.NotificationsPage
      ),
  },
  {
    path: 'reports/new/:spaceId',
    loadComponent: () =>
      import('./report-create/report-create.page').then(
        (m) => m.ReportCreatePage
      ),
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./reports/reports.page').then(
        (m) => m.ReportsPage
      ),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];