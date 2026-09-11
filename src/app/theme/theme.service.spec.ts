import { ThemeService } from './theme.service';
describe('ThemeService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove(
      'ion-palette-dark',
      'slotlab-theme-transition',
    );
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });
  it('alterna il tema e salva la preferenza', () => {
    const service = new ThemeService();
    expect(service.theme()).toBe('dark');
    expect(
      document.documentElement.classList.contains('ion-palette-dark'),
    ).toBe(true);
    service.toggle();
    expect(service.theme()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(
      document.documentElement.classList.contains('slotlab-theme-transition'),
    ).toBe(true);
    expect(localStorage.getItem('slotlab-theme')).toBe('light');
    vi.advanceTimersByTime(1000);
    expect(
      document.documentElement.classList.contains('slotlab-theme-transition'),
    ).toBe(false);
    const restored = new ThemeService();
    expect(restored.theme()).toBe('light');
    expect(
      document.documentElement.classList.contains('slotlab-theme-transition'),
    ).toBe(false);
  });
});
