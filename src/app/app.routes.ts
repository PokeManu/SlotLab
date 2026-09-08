import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { Auth } from './auth/auth';
import { adminGuard } from './auth/admin-guard';
import { guestGuard, sessionGuard } from './auth/session-guard';

const userRoutes: Routes = [
  { path: 'bookings/:id', loadComponent: () => import('./booking-detail/booking-detail.page').then(m => m.UserBookingDetailPage) },
  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.page').then((m) => m.HomePage),
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
    path: 'check-in/:id',
    loadComponent: () => import('./auth/check-in-entry.page').then(m => m.CheckInEntryPage),
  },
];

const adminRoutes: Routes = [
  { path: 'admin/announcements', loadComponent: () => import('./admin-announcements/admin-announcements.page').then(m => m.AdminAnnouncementsPage) },
  {
    path: 'admin/spaces',
    loadComponent: () =>
      import('./admin-spaces/admin-spaces.page').then(
        (m) => m.AdminSpacesPage
      ),
  },
  {
    path: 'admin/reports',
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
    loadComponent: () =>
      import('./admin-statistics/admin-statistics.page').then(
        (m) => m.AdminStatisticsPage
      ),
  },
  { path: 'admin/users', loadComponent: () => import('./admin-users/admin-users.page').then((m) => m.AdminUsersPage) },
  { path: 'admin/buildings', loadComponent: () => import('./admin-buildings/admin-buildings.page').then((m) => m.AdminBuildingsPage) },
  { path: 'admin/availability', loadComponent: () => import('./admin-availability/admin-availability.page').then((m) => m.AdminAvailabilityPage) },
  {
    path: 'admin',
    loadComponent: () => import('./admin-dashboard/admin-dashboard.page').then((m) => m.AdminDashboardPage),
  },
];

// La stessa destinazione iniziale vale anche per gli indirizzi sconosciuti.
const landing = () => {
  const auth = inject(Auth);
  return auth.user() ? auth.homePath : '/login';
};

export const routes: Routes = [
  { path: 'forgot-password', canActivate: [guestGuard], data: { mode: 'forgot' }, loadComponent: () => import('./auth/account.page').then(m => m.AccountPage) },
  { path: 'profile/password', canActivate: [sessionGuard], data: { mode: 'password', access: 'authenticated' }, loadComponent: () => import('./auth/account.page').then(m => m.AccountPage) },
  { path: 'profile/delete', canActivate: [sessionGuard], data: { mode: 'delete', access: 'user' }, loadComponent: () => import('./auth/account.page').then(m => m.AccountPage) },
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./auth/access.page').then(m => m.AccessPage) },
  { path: 'register', canActivate: [guestGuard], data: { mode: 'register' }, loadComponent: () => import('./auth/access.page').then(m => m.AccessPage) },
  ...userRoutes.map(route => ({ ...route, data: { access: 'user' }, canActivate: [sessionGuard] })),
  ...adminRoutes.map(route => ({ ...route, data: { access: 'admin' }, canActivate: [adminGuard] })),
  {
    path: 'profile', data: { access: 'authenticated' }, canActivate: [sessionGuard],
    loadComponent: () => import('./profile/profile.page').then(m => m.ProfilePage),
  },
  { path: '', pathMatch: 'full', redirectTo: landing },
  { path: '**', redirectTo: landing },
];
