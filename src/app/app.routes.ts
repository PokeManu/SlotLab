import { Routes } from '@angular/router';

export const routes: Routes = [
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
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
