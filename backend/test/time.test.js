const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  checkInWindow,
  isAtLeastAhead,
  localDateTimeToInstant,
} = require('../domain/time');

test('rifiuta un orario locale inesistente nel salto primaverile', () => {
  assert.throws(
    () => localDateTimeToInstant('2026-03-29', '02:30'),
    error => error.code === 'INVALID_LOCAL_TIME',
  );
});

test('sceglie la prima occorrenza per un orario ambiguo e consente la seconda esplicita', () => {
  assert.equal(
    localDateTimeToInstant('2026-10-25', '02:30').toISOString(),
    '2026-10-25T00:30:00.000Z',
  );
  assert.equal(
    localDateTimeToInstant('2026-10-25', '02:30', { disambiguation: 'later' }).toISOString(),
    '2026-10-25T01:30:00.000Z',
  );
});

test('l’anticipo minimo di un’ora attraversa la mezzanotte e il cambio DST', () => {
  assert.equal(
    isAtLeastAhead('2026-09-11', '00:30', 3600, new Date('2026-09-10T21:30:00.000Z')),
    true,
  );
  assert.equal(
    isAtLeastAhead('2026-09-11', '00:30', 3600, new Date('2026-09-10T21:30:01.000Z')),
    false,
  );
  assert.equal(
    isAtLeastAhead('2026-03-29', '03:30', 2 * 3600, new Date('2026-03-28T23:30:00.000Z')),
    true,
  );
});

test('la finestra di check-in usa secondi reali e include i due estremi', () => {
  const start = localDateTimeToInstant('2026-09-10', '10:00');
  assert.equal(checkInWindow('2026-09-10', '10:00', new Date(start.getTime() - 15 * 60000)), null);
  assert.equal(checkInWindow('2026-09-10', '10:00', new Date(start.getTime() + 30 * 60000)), null);
  assert.equal(checkInWindow('2026-09-10', '10:00', new Date(start.getTime() - 15 * 60000 - 1)), 'early');
  assert.equal(checkInWindow('2026-09-10', '10:00', new Date(start.getTime() + 30 * 60000 + 1)), 'expired');
});
