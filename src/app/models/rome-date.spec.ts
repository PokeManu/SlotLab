import { romeDate } from './rome-date';

describe('romeDate', () => {
  it('usa il giorno italiano oltre la mezzanotte invernale ed estiva', () => {
    expect(romeDate(new Date('2026-01-31T23:30:00Z'))).toBe('2026-02-01');
    expect(romeDate(new Date('2026-08-31T22:30:00Z'))).toBe('2026-09-01');
  });
  it('gestisce le giornate del cambio dell’ora', () => {
    expect(romeDate(new Date('2026-03-29T22:30:00Z'))).toBe('2026-03-30');
    expect(romeDate(new Date('2026-10-25T22:30:00Z'))).toBe('2026-10-25');
  });
});
