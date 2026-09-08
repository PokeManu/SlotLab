const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();
const { queries } = require('../db/transaction');
const { statistics, validateStatisticsPeriod } = require('../db/statistics');

const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');

function openDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(':memory:', error => error ? reject(error) : resolve(db));
  });
}

function closeDatabase(db) {
  return new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
}

async function createFixture() {
  const connection = await openDatabase();
  const db = queries(connection);
  await db.run('PRAGMA foreign_keys = ON;');
  await new Promise((resolve, reject) => connection.exec(schema, error => error ? reject(error) : resolve()));
  await db.run(`CREATE TABLE occurrence_tracking (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    tracking_started_at TEXT,
    consolidated_until TEXT
  );`);
  await db.run('INSERT INTO occurrence_tracking (id, tracking_started_at, consolidated_until) VALUES (1, ?, ?);',
    ['2026-09-01T00:00:00.000Z', '2026-09-30T23:59:59.000Z']);
  await db.run('INSERT INTO buildings (id, number, name, address, latitude, longitude) VALUES (1, 1, ?, ?, 38, 13);', ['Edificio A', 'Viale delle Scienze']);
  await db.run(`INSERT INTO spaces (id, building_id, name, floor, type, capacity, accessible, status)
    VALUES (1, 1, 'Aula 1', 1, 'study_room', 20, 1, 'active');`);
  await db.run(`INSERT INTO availabilities
    (id, space_id, valid_from, valid_until, weekday, start_time, end_time, is_retired)
    VALUES (1, 1, '2026-01-01', '2026-12-31', 4, '09:00', '10:00', 0),
           (2, 1, '2026-01-01', '2026-12-31', 4, '09:00', '10:00', 1),
           (3, 1, '2026-01-01', '2026-12-31', 4, '13:00', '14:00', 0),
           (4, 1, '2026-01-01', '2026-12-31', 4, '15:00', '16:00', 0),
           (5, 1, '2026-01-01', '2026-12-31', 4, '17:00', '18:00', 0),
           (6, 1, '2026-01-01', '2026-12-31', 4, '19:00', '20:00', 0);`);
  await db.run(`INSERT INTO slot_occurrences
    (id, space_id, date, start_time, end_time, offered_capacity, was_offered, finalized_at)
    VALUES (1, 1, '2026-09-10', '09:00', '10:00', 20, 1, '2026-09-10T07:00:00.000Z'),
           (2, 1, '2026-09-11', '11:00', '12:00', 20, 1, '2026-09-11T09:00:00.000Z'),
           (3, 1, '2026-09-10', '13:00', '14:00', 0, 0, '2026-09-10T11:00:00.000Z'),
           (4, 1, '2026-09-10', '15:00', '16:00', 0, 0, '2026-09-10T13:00:00.000Z'),
           (5, 1, '2026-09-10', '17:00', '18:00', 20, 1, '2026-09-10T15:00:00.000Z'),
           (6, 1, '2026-09-10', '19:00', '20:00', 20, 1, '2026-09-10T17:00:00.000Z');`);
  for (let id = 1; id <= 12; id += 1) {
    await db.run(`INSERT INTO users (id, first_name, last_name, email, password_hash, role, created_at)
      VALUES (?, ?, 'User', ?, 'hash', 'user', '2026-01-01T00:00:00.000Z');`, [id, `User${id}`, `user${id}@example.test`]);
  }
  await db.run(`INSERT INTO bookings (id, space_id, availability_id, date, status, created_at)
    VALUES (1, 1, 1, '2026-09-10', 'completed', '2026-09-01T00:00:00.000Z'),
           (2, 1, 1, '2026-09-10', 'completed', '2026-09-01T00:00:00.000Z'),
           (3, 1, 2, '2026-09-10', 'completed', '2026-09-01T00:00:00.000Z');`);
  for (let id = 1; id <= 12; id += 1) {
    const bookingId = id <= 3 ? 1 : id <= 7 ? 2 : 3;
    await db.run(`INSERT INTO booking_participants (booking_id, user_id, participant_role, present, checked_in_at)
      VALUES (?, ?, ?, ?, ?);`, [bookingId, id, id === (bookingId === 1 ? 1 : bookingId === 2 ? 4 : 8) ? 'organizer' : 'participant', id <= 9 ? 1 : 0,
      id <= 9 ? '2026-09-10T08:30:00.000Z' : null]);
  }
  await db.run(`INSERT INTO reports
    (user_id, space_id, category, description, priority, status, created_at, updated_at)
    VALUES (1, 1, 'technical', 'Problema tecnico', 'high', 'open', '2026-09-10T08:00:00.000Z', '2026-09-10T08:00:00.000Z'),
           (2, 1, 'other', 'Altro problema', 'low', 'resolved', '2026-09-09T22:30:00.000Z', '2026-09-09T22:30:00.000Z'),
           (3, 1, 'cleaning', 'Fuori periodo', 'medium', 'open', '2026-10-01T08:00:00.000Z', '2026-10-01T08:00:00.000Z');`);
  return { connection, db };
}

test('statistiche: coorte di snapshot, gruppi distinti, ritirate, tassi e segnalazioni', async t => {
  const fixture = await createFixture();
  t.after(() => closeDatabase(fixture.connection));
  const result = await statistics(fixture.db, '2026-09-10', '2026-09-10', new Date('2026-09-10T15:30:00.000Z'));

  assert.equal(result.bookings, 3);
  assert.equal(result.participants, 12);
  assert.equal(result.presences, 9);
  assert.equal(result.absences, 3);
  assert.equal(result.offeredCapacity, 20);
  assert.equal(result.utilizationRate, 45);
  assert.equal(result.checkInRate, 75);
  assert.deepEqual(result.daily, [{ date: '2026-09-10', bookings: 3 }]);
  assert.deepEqual(result.usage, [{ type: 'study_room', presences: 9, percentage: 100 }]);
  assert.deepEqual(result.mostBookedSpaces, [{ spaceId: 1, spaceName: 'Aula 1', bookings: 3, participants: 12, presences: 9 }]);
  assert.deepEqual(result.mostUsedSlots, [
    { startTime: '09:00', endTime: '10:00', bookings: 3, participants: 12, presences: 9 },
  ]);
  assert.deepEqual(result.reportsByCategory, [{ category: 'other', count: 1 }, { category: 'technical', count: 1 }]);
  assert.deepEqual(result.reportsByStatus, [{ status: 'open', count: 1 }, { status: 'resolved', count: 1 }]);
  assert.deepEqual(result.history, {
    trackingStartedAt: '2026-09-01T00:00:00.000Z', complete: true, excludedBookings: 0,
    ambiguousOccurrences: 0, gapOccurrences: 0,
  });
});

test('rapporti storici: 20 posti con tre gruppi, fascia vuota e marker nello stesso giorno', async t => {
  const fixture = await createFixture();
  t.after(() => closeDatabase(fixture.connection));
  // Due sole fasce offerte, entrambe terminate: la seconda è senza prenotazioni.
  await fixture.db.run('DELETE FROM slot_occurrences WHERE id IN (5,6);');
  const twoDays = await statistics(fixture.db, '2026-09-10', '2026-09-11', new Date('2026-09-11T10:00:00.000Z'));
  assert.equal(twoDays.bookings, 3);
  assert.equal(twoDays.participants, 12);
  assert.equal(twoDays.presences, 9);
  assert.equal(twoDays.offeredCapacity, 40);
  assert.equal(twoDays.utilizationRate, 22.5);
  await fixture.db.run("UPDATE booking_participants SET present=1, checked_in_at='2026-09-10T08:30:00.000Z' WHERE user_id=10;");
  const tenPresent = await statistics(fixture.db, '2026-09-10', '2026-09-11', new Date('2026-09-11T10:00:00.000Z'));
  assert.equal(tenPresent.presences, 10);
  assert.equal(tenPresent.utilizationRate, 25);

  await fixture.db.run('DELETE FROM booking_participants;');
  await fixture.db.run('DELETE FROM bookings;');
  await fixture.db.run('UPDATE occurrence_tracking SET tracking_started_at=?, consolidated_until=? WHERE id=1;',
    ['2026-09-10T10:00:00.000Z', '2026-09-10T15:00:00.000Z']);
  const beforeMarker = await statistics(fixture.db, '2026-09-10', '2026-09-10', new Date('2026-09-10T15:30:00.000Z'));
  assert.equal(beforeMarker.bookings, 0);
  assert.equal(beforeMarker.history.complete, false);
  const future = await statistics(fixture.db, '2026-09-11', '2026-09-12', new Date('2026-09-10T15:30:00.000Z'));
  assert.equal(future.bookings, 0);
  assert.equal(future.offeredCapacity, 0);
  assert.equal(future.history.complete, true);
});

test('statistiche: future, in corso, indisponibili e booking senza snapshot non entrano nella coorte', async t => {
  const fixture = await createFixture();
  t.after(() => closeDatabase(fixture.connection));
  await fixture.db.run('UPDATE slot_occurrences SET offered_capacity=NULL, was_offered=NULL, finalized_at=NULL WHERE id=3;');
  await fixture.db.run(`INSERT INTO bookings (id, space_id, availability_id, date, status, created_at)
    VALUES (4, 1, 3, '2026-09-10', 'completed', '2026-09-01T00:00:00.000Z'),
           (5, 1, 4, '2026-09-10', 'completed', '2026-09-01T00:00:00.000Z'),
           (6, 1, 5, '2026-09-10', 'confirmed', '2026-09-01T00:00:00.000Z'),
           (7, 1, 6, '2026-09-10', 'confirmed', '2026-09-01T00:00:00.000Z');`);
  const result = await statistics(fixture.db, '2026-09-10', '2026-09-10', new Date('2026-09-10T15:30:00.000Z'));
  assert.equal(result.bookings, 3);
  assert.equal(result.offeredCapacity, 20);
  assert.equal(result.history.complete, false);
  assert.equal(result.history.excludedBookings, 2);
});

test('periodo statistiche: date reali, obbligatorie e nessun campo legacy o extra', () => {
  assert.deepEqual(validateStatisticsPeriod({ dateFrom: '2026-02-01', dateTo: '2026-02-28' }), {
    dateFrom: '2026-02-01', dateTo: '2026-02-28',
  });
  for (const query of [
    {},
    { dateFrom: '2026-02-01' },
    { dateFrom: '2026-02-01', dateTo: '2026-02-30' },
    { dateFrom: '2026-03-01', dateTo: '2026-02-28' },
    { from: '2026-02-01', until: '2026-02-28' },
    { dateFrom: '2026-02-01', dateTo: '2026-02-28', extra: true },
  ]) assert.throws(() => validateStatisticsPeriod(query), error => error.code === 'VALIDATION_ERROR' && error.status === 400);
});
