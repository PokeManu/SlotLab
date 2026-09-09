const crypto = require('node:crypto');
const path = require('node:path');
const { closeDatabase, connectDatabase } = require('./db');
const { consolidateOccurrences } = require('./occurrences');
const { queries } = require('./transaction');
const { hashPassword } = require('../security/password');
const { romeNow } = require('../domain/time');

const PERIOD = { validFrom: '2026-01-01', validUntil: '2099-12-31' };
const SLOT_TIMES = [
  { startTime: '08:00', endTime: '10:00' },
  { startTime: '10:00', endTime: '12:00' },
  { startTime: '14:00', endTime: '16:00' },
];
const DEMO_USERS = [
  ['Alessia', 'Romano', 'alessia.romano@demo.slotlab.test'],
  ['Davide', 'Costa', 'davide.costa@demo.slotlab.test'],
  ['Giulia', 'Ferrara', 'giulia.ferrara@demo.slotlab.test'],
  ['Lorenzo', 'Greco', 'lorenzo.greco@demo.slotlab.test'],
  ['Martina', 'Rizzo', 'martina.rizzo@demo.slotlab.test'],
  ['Simone', 'Conti', 'simone.conti@demo.slotlab.test'],
];

function selectedDatabasePath(environment = process.env) {
  if (!environment.SLOTLAB_DEMO_DB_PATH) {
    throw new Error('SLOTLAB_DEMO_DB_PATH deve indicare un database separato di prova.');
  }
  const selected = path.resolve(environment.SLOTLAB_DEMO_DB_PATH);
  const operational = path.resolve(environment.SLOTLAB_DB_PATH || path.join(__dirname, 'database.sqlite'));
  if (selected === operational) {
    throw new Error('Il seed demo non può modificare il database operativo.');
  }
  return selected;
}

function shiftedDate(baseDate, days) {
  const date = new Date(`${baseDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekday(date) {
  return new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
}

async function ensureDemoUsers(db) {
  const users = [];
  for (const [firstName, lastName, email] of DEMO_USERS) {
    let user = await db.get('SELECT id, email FROM users WHERE email = ?;', [email]);
    if (!user) {
      const randomPassword = `Demo!${crypto.randomBytes(12).toString('hex')}`;
      const passwordHash = await hashPassword(randomPassword);
      const result = await db.run(
        `INSERT INTO users (first_name, last_name, email, password_hash, role, created_at)
         VALUES (?, ?, ?, ?, 'user', ?);`,
        [firstName, lastName, email, passwordHash, new Date().toISOString()],
      );
      user = { id: result.lastId, email };
    }
    users.push(user);
  }
  return users;
}

async function replaceActiveAvailabilities(db, spaces) {
  const desiredTimes = new Set(SLOT_TIMES.map(slot => `${slot.startTime}-${slot.endTime}`));
  for (const space of spaces) {
    const activeRows = await db.all(
      `SELECT id, valid_from AS validFrom, valid_until AS validUntil,
              start_time AS startTime, end_time AS endTime
         FROM availabilities WHERE space_id = ? AND is_retired = 0;`,
      [space.id],
    );
    for (const row of activeRows) {
      const isDemoSlot = row.validFrom === PERIOD.validFrom
        && row.validUntil === PERIOD.validUntil
        && desiredTimes.has(`${row.startTime}-${row.endTime}`);
      if (!isDemoSlot) await db.run('UPDATE availabilities SET is_retired = 1 WHERE id = ?;', [row.id]);
    }
    for (let day = 1; day <= 7; day += 1) {
      for (const slot of SLOT_TIMES) {
        await db.run(
          `INSERT OR IGNORE INTO availabilities
             (space_id, valid_from, valid_until, weekday, start_time, end_time, is_retired)
           VALUES (?, ?, ?, ?, ?, ?, 0);`,
          [space.id, PERIOD.validFrom, PERIOD.validUntil, day, slot.startTime, slot.endTime],
        );
      }
    }
  }
}

async function removePreviousDemoBookings(db, userIds) {
  const placeholders = userIds.map(() => '?').join(',');
  const requests = await db.all(
    `SELECT booking_id AS bookingId FROM booking_requests
      WHERE user_id IN (${placeholders}) AND idempotency_key LIKE 'slotlab-demo-v1-%';`,
    userIds,
  );
  const bookingIds = requests.map(request => request.bookingId).filter(Number.isInteger);
  if (bookingIds.length) {
    await db.run(`DELETE FROM bookings WHERE id IN (${bookingIds.map(() => '?').join(',')});`, bookingIds);
  }
  await db.run(
    `DELETE FROM booking_requests
      WHERE user_id IN (${placeholders}) AND idempotency_key LIKE 'slotlab-demo-v1-%';`,
    userIds,
  );
}

async function createDemoBookings(db, spaces, users, today) {
  let created = 0;
  for (const [spaceIndex, space] of spaces.entries()) {
    const examples = [
      { offset: -(spaceIndex + 2), slotIndex: 0, status: 'completed' },
      { offset: -(spaceIndex + 1), slotIndex: 1, status: 'completed' },
      { offset: spaceIndex + 1, slotIndex: 0, status: 'confirmed' },
      { offset: spaceIndex + 4, slotIndex: 2, status: 'confirmed' },
    ];
    for (const [exampleIndex, example] of examples.entries()) {
      const date = shiftedDate(today, example.offset);
      const slotTime = SLOT_TIMES[example.slotIndex];
      const availability = await db.get(
        `SELECT id FROM availabilities
          WHERE space_id = ? AND weekday = ? AND start_time = ? AND end_time = ?
            AND valid_from <= ? AND valid_until >= ? AND is_retired = 0;`,
        [space.id, weekday(date), slotTime.startTime, slotTime.endTime, date, date],
      );
      const organizer = users[(spaceIndex * examples.length + exampleIndex) % users.length];
      const createdAt = example.status === 'completed'
        ? `${shiftedDate(date, -7)}T09:00:00.000Z`
        : new Date().toISOString();
      const booking = await db.run(
        `INSERT INTO bookings (space_id, availability_id, date, status, created_at)
         VALUES (?, ?, ?, ?, ?);`,
        [space.id, availability.id, date, example.status, createdAt],
      );
      const present = example.status === 'completed' && exampleIndex % 2 === 0 ? 1 : 0;
      await db.run(
        `INSERT INTO booking_participants
           (booking_id, user_id, participant_role, present, checked_in_at)
         VALUES (?, ?, 'organizer', ?, ?);`,
        [booking.lastId, organizer.id, present, present ? `${date}T07:55:00.000Z` : null],
      );
      const idempotencyKey = `slotlab-demo-v1-${space.id}-${exampleIndex}`;
      const requestHash = crypto.createHash('sha256').update(idempotencyKey).digest('hex');
      await db.run(
        `INSERT INTO booking_requests
           (user_id, idempotency_key, request_hash, booking_id, created_at)
         VALUES (?, ?, ?, ?, ?);`,
        [organizer.id, idempotencyKey, requestHash, booking.lastId, createdAt],
      );
      created += 1;
    }
  }
  return created;
}

async function seedDemo(options = {}) {
  const environment = options.environment || process.env;
  const databasePath = options.databasePath || selectedDatabasePath(environment);
  const operationalPath = path.resolve(environment.SLOTLAB_DB_PATH || path.join(__dirname, 'database.sqlite'));
  if (path.resolve(databasePath) === operationalPath) {
    throw new Error('Il seed demo non può modificare il database operativo.');
  }
  const connection = await connectDatabase({ databasePath });
  const db = queries(connection);
  await db.run('BEGIN IMMEDIATE;');
  try {
    const spaces = await db.all('SELECT id, name FROM spaces ORDER BY id;');
    if (!spaces.length) throw new Error('Nessuno spazio presente: eseguire prima npm run db:seed.');
    const users = await ensureDemoUsers(db);
    await removePreviousDemoBookings(db, users.map(user => user.id));
    await replaceActiveAvailabilities(db, spaces);
    const bookingCount = await createDemoBookings(db, spaces, users, romeNow().date);
    await consolidateOccurrences(db);
    await db.run('COMMIT;');
    return { spaceCount: spaces.length, userCount: users.length, bookingCount,
      availabilityCount: spaces.length * 7 * SLOT_TIMES.length };
  } catch (error) {
    await db.run('ROLLBACK;');
    throw error;
  }
}

if (require.main === module) {
  seedDemo()
    .then(result => {
      console.log(`Spazi configurati: ${result.spaceCount}`);
      console.log(`Fasce attive inserite: ${result.availabilityCount}`);
      console.log(`Utenti demo verificati: ${result.userCount}`);
      console.log(`Prenotazioni demo inserite: ${result.bookingCount}`);
    })
    .catch(error => {
      console.error(`Dati demo non inseriti: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(closeDatabase);
}

module.exports = { seedDemo, selectedDatabasePath };
