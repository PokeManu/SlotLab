import { appLayoutFor } from './app-layout';

describe('appLayoutFor', () => {
  it('usa il layout utente per le sezioni principali', () => {
    for (const url of [
      '/home',
      '/spaces?search=aula',
      '/bookings#upcoming',
      '/favorites/',
      '/notifications',
      '/reports',
      '/profile/',
    ]) {
      expect(appLayoutFor(url, 'user')).toBe('user');
    }
  });

  it('mantiene le pagine di dettaglio e transazionali a schermo intero', () => {
    for (const url of [
      '/spaces/12',
      '/booking/12',
      '/bookings/12',
      '/confirmation/12',
      '/reports/new/12',
      '/check-in/12',
    ]) {
      expect(appLayoutFor(url, 'user')).toBe('fullscreen');
    }
  });

  it('usa il layout amministratore per admin e profilo condiviso', () => {
    expect(appLayoutFor('/admin', 'admin')).toBe('admin');
    expect(appLayoutFor('/admin/bookings', 'admin')).toBe('admin');
    expect(appLayoutFor('/admin/statistics?period=month', 'admin')).toBe(
      'admin',
    );
    expect(appLayoutFor('/profile', 'admin')).toBe('admin');
  });

  it('non espone un layout autenticato a ospiti o ruoli incompatibili', () => {
    for (const role of [null, 'user', 'admin'] as const) {
      expect(appLayoutFor('/login', role)).toBe('fullscreen');
      expect(appLayoutFor('/register', role)).toBe('fullscreen');
    }

    expect(appLayoutFor('/admin', 'user')).toBe('fullscreen');
    expect(appLayoutFor('/home', 'admin')).toBe('fullscreen');
    expect(appLayoutFor('/profile/password', 'user')).toBe('fullscreen');
  });
});
