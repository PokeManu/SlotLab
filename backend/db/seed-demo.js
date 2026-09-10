const crypto = require('node:crypto');
const path = require('node:path');
const { closeDatabase, connectDatabase } = require('./db');
const { consolidateOccurrences } = require('./occurrences');
const { queries } = require('./transaction');
const { hashPassword } = require('../security/password');
const { localDateTimeToInstant, romeNow } = require('../domain/time');

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
  ['Elena', 'Marino', 'elena.marino@demo.slotlab.test'],
  ['Marco', 'Vitale', 'marco.vitale@demo.slotlab.test'],
  ['Chiara', 'Lombardo', 'chiara.lombardo@demo.slotlab.test'],
  ['Andrea', 'Caruso', 'andrea.caruso@demo.slotlab.test'],
];

const DEMO_REPORTS = [
  { category: 'technical', priority: 'high', status: 'open', description: 'Presa elettrica non funzionante.' },
  { category: 'technical', priority: 'high', status: 'in_progress', description: 'Proiettore con immagine intermittente.' },
  { category: 'accessibility', priority: 'high', status: 'resolved', description: 'Accesso alla postazione ostacolato.' },
  { category: 'cleaning', priority: 'medium', status: 'open', description: 'Tavoli da pulire.' },
  { category: 'cleaning', priority: 'medium', status: 'resolved', description: 'Cestino pieno.' },
  { category: 'other', priority: 'low', status: 'in_progress', description: 'Rumore eccessivo nella sala.' },
  { category: 'other', priority: 'low', status: 'resolved', description: 'Illuminazione insufficiente.' },
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
      WHERE user_id IN (${placeholders}) AND idempotency_key LIKE 'slotlab-demo-%';`,
    userIds,
  );
  const bookingIds = requests.map(request => request.bookingId).filter(Number.isInteger);
  if (bookingIds.length) {
    await db.run(`DELETE FROM bookings WHERE id IN (${bookingIds.map(() => '?').join(',')});`, bookingIds);
  }
  await db.run(
    `DELETE FROM booking_requests
      WHERE user_id IN (${placeholders}) AND idempotency_key LIKE 'slotlab-demo-%';`,
    userIds,
  );
}

function checkedInAt(date, startTime, minutesBefore) {
  const start = localDateTimeToInstant(date, startTime);
  return new Date(start.getTime() - minutesBefore * 60_000).toISOString();
}

async function insertParticipants(db, bookingId, users, firstUserIndex, groupSize, absenceCount, date, startTime, completed) {
  for (let memberIndex = 0; memberIndex < groupSize; memberIndex += 1) {
    const user = users[(firstUserIndex + memberIndex) % users.length];
    const present = completed && memberIndex < groupSize - absenceCount;
    await db.run(
      `INSERT INTO booking_participants
         (booking_id, user_id, participant_role, present, checked_in_at)
       VALUES (?, ?, ?, ?, ?);`,
      [bookingId, user.id, memberIndex === 0 ? 'organizer' : 'participant',
        present ? 1 : 0, present ? checkedInAt(date, startTime, 5 + memberIndex) : null],
    );
  }
}

async function createDemoBookings(db, spaces, users, today) {
  let created = 0;
  let completed = 0;
  let future = 0;
  let completedParticipants = 0;
  let presences = 0;
  for (const [spaceIndex, space] of spaces.entries()) {
    const completedExamples = Array.from({ length: 6 }, (_, index) => ({
      offset: -(index + 1),
      slotIndex: (spaceIndex + index) % SLOT_TIMES.length,
      status: 'completed',
      groupSize: 3 + ((spaceIndex + index) % 4),
      absenceCount: (spaceIndex + index) % 3,
    }));
    const futureExamples = [
      { offset: spaceIndex + 1, slotIndex: 0, status: 'confirmed', groupSize: 3, absenceCount: 0 },
      { offset: spaceIndex + 4, slotIndex: 2, status: 'confirmed', groupSize: 2, absenceCount: 0 },
    ];
    const examples = [...completedExamples, ...futureExamples];
    for (const [exampleIndex, example] of examples.entries()) {
      const date = shiftedDate(today, example.offset);
      const slotTime = SLOT_TIMES[example.slotIndex];
      const availability = await db.get(
        `SELECT id FROM availabilities
          WHERE space_id = ? AND weekday = ? AND start_time = ? AND end_time = ?
            AND valid_from <= ? AND valid_until >= ? AND is_retired = 0;`,
        [space.id, weekday(date), slotTime.startTime, slotTime.endTime, date, date],
      );
      const organizerIndex = (spaceIndex * examples.length + exampleIndex) % users.length;
      const organizer = users[organizerIndex];
      const createdAt = example.status === 'completed'
        ? `${shiftedDate(date, -7)}T09:00:00.000Z`
        : new Date().toISOString();
      const booking = await db.run(
        `INSERT INTO bookings (space_id, availability_id, date, status, created_at)
         VALUES (?, ?, ?, ?, ?);`,
        [space.id, availability.id, date, example.status, createdAt],
      );
      await insertParticipants(
        db, booking.lastId, users,
        organizerIndex,
        example.groupSize, example.absenceCount,
        date, slotTime.startTime, example.status === 'completed',
      );
      const idempotencyKey = `slotlab-demo-v2-${space.id}-${exampleIndex}`;
      const requestHash = crypto.createHash('sha256').update(idempotencyKey).digest('hex');
      await db.run(
        `INSERT INTO booking_requests
           (user_id, idempotency_key, request_hash, booking_id, created_at)
         VALUES (?, ?, ?, ?, ?);`,
        [organizer.id, idempotencyKey, requestHash, booking.lastId, createdAt],
      );
      created += 1;
      if (example.status === 'completed') {
        completed += 1;
        completedParticipants += example.groupSize;
        presences += example.groupSize - example.absenceCount;
      } else {
        future += 1;
      }
    }
  }
  return { total: created, completed, future, participants: completedParticipants,
    presences, absences: completedParticipants - presences };
}

async function createDemoReports(db, spaces, users, today) {
  const placeholders = users.map(() => '?').join(',');
  await db.run(
    `DELETE FROM reports
      WHERE user_id IN (${placeholders}) AND description LIKE '[Demo statistiche] %';`,
    users.map(user => user.id),
  );
  for (const [index, report] of DEMO_REPORTS.entries()) {
    const date = shiftedDate(today, -(index + 1));
    const createdAt = localDateTimeToInstant(date, '11:00').toISOString();
    const updatedAt = report.status === 'open'
      ? createdAt
      : new Date(new Date(createdAt).getTime() + 60 * 60_000).toISOString();
    await db.run(
      `INSERT INTO reports
         (user_id, space_id, category, description, priority, status, photo_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?);`,
      [users[index % users.length].id, spaces[index % spaces.length].id,
        report.category, `[Demo statistiche] ${report.description}`,
        report.priority, report.status, createdAt, updatedAt],
    );
  }
  return DEMO_REPORTS.length;
}

async function prepareStatisticsHistory(db, today) {
  const monthStart = `${today.slice(0, 7)}-01`;
  const start = localDateTimeToInstant(monthStart, '00:00').toISOString();
  await db.run(
    `INSERT INTO occurrence_tracking (id, tracking_started_at, consolidated_until)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tracking_started_at = excluded.tracking_started_at,
       consolidated_until = excluded.consolidated_until;`,
    [start, start],
  );
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
    const bookingSummary = await createDemoBookings(db, spaces, users, romeNow().date);
    const reportCount = await createDemoReports(db, spaces, users, romeNow().date);
    await prepareStatisticsHistory(db, romeNow().date);
    await consolidateOccurrences(db);
    await db.run('COMMIT;');
    return { spaceCount: spaces.length, userCount: users.length,
      bookingCount: bookingSummary.total, completedBookingCount: bookingSummary.completed,
      futureBookingCount: bookingSummary.future, participantCount: bookingSummary.participants,
      presenceCount: bookingSummary.presences, absenceCount: bookingSummary.absences,
      reportCount, availabilityCount: spaces.length * 7 * SLOT_TIMES.length };
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
      console.log(`Prenotazioni demo inserite: ${result.bookingCount} (${result.completedBookingCount} concluse, ${result.futureBookingCount} future)`);
      console.log(`Partecipazioni concluse: ${result.participantCount} (${result.presenceCount} presenze, ${result.absenceCount} assenze)`);
      console.log(`Segnalazioni demo inserite: ${result.reportCount}`);
    })
    .catch(error => {
      console.error(`Dati demo non inseriti: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(closeDatabase);
}

module.exports = { seedDemo, selectedDatabasePath };
