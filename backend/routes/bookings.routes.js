const { occupiedSeats } = require('../db/occupied-seats');
const crypto = require('node:crypto');
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateEmail } = require('../security/validation');
const { transaction, queries } = require('../db/transaction');
const { getDatabase } = require('../db/db');
const { isAtLeastAhead, romeNow } = require('../domain/time');

const router = express.Router();
router.use(requireAuth, requireRole('user'));

function error(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

function id(value, code) {
  if (!/^[1-9][0-9]*$/.test(String(value))) throw error(400, code, 'Identificativo non valido.');
  return Number(value);
}

function dateInfo(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw error(400, 'VALIDATION_ERROR', 'La data non è valida.');
  }
  const parsed = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw error(400, 'VALIDATION_ERROR', 'La data non è valida.');
  }
  return { value, weekday: parsed.getUTCDay() || 7 };
}

function isAtLeastOneHourAhead(date, startTime, instant) {
  try {
    return isAtLeastAhead(date, startTime, 60 * 60, instant);
  } catch (cause) {
    throw error(409, 'INVALID_LOCAL_TIME', cause.message);
  }
}

function requestHash(input) {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

function publicBooking(row) {
  return { id: row.id, spaceId: row.space_id, availabilityId: row.availability_id,
    date: row.date, status: row.status, createdAt: row.created_at };
}

async function bookingView(bookingId, userId, detailed = false) {
  const db = queries(getDatabase());
  const booking = await db.get(
    `SELECT b.id, b.space_id AS spaceId, s.name AS spaceName, bu.name AS building, s.floor,
            b.availability_id AS availabilityId,
            b.date, a.start_time AS startTime, a.end_time AS endTime, b.status,
            b.created_at AS createdAt
       FROM bookings b JOIN spaces s ON s.id = b.space_id JOIN buildings bu ON bu.id = s.building_id
       JOIN availabilities a ON a.id = b.availability_id
       JOIN booking_participants viewer ON viewer.booking_id = b.id
      WHERE b.id = ? AND viewer.user_id = ?;`, [bookingId, userId],
  );
  if (!booking) throw error(404, 'BOOKING_NOT_FOUND', 'La prenotazione richiesta non esiste.');
  const participants = await db.all(
    `SELECT u.id, bp.id AS participantId, u.first_name AS firstName, u.last_name AS lastName, u.email,
            bp.participant_role AS participantRole, bp.present, bp.checked_in_at AS checkedInAt
       FROM booking_participants bp JOIN users u ON u.id = bp.user_id
      WHERE bp.booking_id = ? ORDER BY bp.participant_role DESC, u.last_name, u.first_name;`, [bookingId],
  );
  const normalizedParticipants = participants.map(participant => ({ ...participant, present: Boolean(participant.present) }));
  const organizer = normalizedParticipants.find(participant => participant.participantRole === 'organizer');
  return { ...booking, organizer, participants: detailed ? normalizedParticipants : undefined,
    participantCount: normalizedParticipants.length };
}

router.get('/', async (request, response) => {
  const page = request.query.page === undefined ? 1 : Number(request.query.page);
  const size = request.query.size === undefined ? 20 : Number(request.query.size);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(size) || size < 1 || size > 100) {
    throw error(400, 'VALIDATION_ERROR', 'I parametri di paginazione non sono validi.');
  }
  const db = queries(getDatabase());
  const now = romeNow();
  const endAfter = `${now.date} ${now.time}`;
  const total = await db.get(
    `SELECT COUNT(*) AS count FROM bookings b JOIN availabilities a ON a.id=b.availability_id JOIN booking_participants bp ON bp.booking_id = b.id
      WHERE bp.user_id = ? AND b.status = 'confirmed' AND b.date || ' ' || a.end_time > ?;`, [request.user.id, endAfter],
  );
  const rows = await db.all(
    `SELECT b.id FROM bookings b JOIN availabilities a ON a.id=b.availability_id JOIN booking_participants bp ON bp.booking_id = b.id
      WHERE bp.user_id = ? AND b.status = 'confirmed' AND b.date || ' ' || a.end_time > ?
      ORDER BY b.date ASC, b.id ASC LIMIT ? OFFSET ?;`,
    [request.user.id, endAfter, size, (page - 1) * size],
  );
  const data = [];
  for (const row of rows) data.push(await bookingView(row.id, request.user.id, false));
  response.json({ data, pagination: { page, size, totalElements: total.count, totalPages: Math.ceil(total.count / size) } });
});

router.get('/:bookingId', async (request, response) => {
  const bookingId = id(request.params.bookingId, 'INVALID_BOOKING_ID');
  response.json({ data: await bookingView(bookingId, request.user.id, true) });
});

async function loadEditableBooking(db, bookingId, userId) {
  const booking = await db.get(
    `SELECT b.id, b.space_id AS spaceId, b.date, b.status, a.start_time AS startTime, a.end_time AS endTime
       FROM bookings b JOIN availabilities a ON a.id = b.availability_id
      WHERE b.id = ?;`, [bookingId],
  );
  if (!booking) throw error(404, 'BOOKING_NOT_FOUND', 'La prenotazione richiesta non esiste.');
  const organizer = await db.get(
    `SELECT user_id AS userId FROM booking_participants
      WHERE booking_id = ? AND participant_role = 'organizer';`, [bookingId],
  );
  if (!organizer || organizer.userId !== userId) throw error(403, 'FORBIDDEN', 'Solo l’organizzatore può gestire il gruppo.');
  const now = new Date();
  const today = romeNow(now).date;
  if (booking.status !== 'confirmed' || booking.date < today ||
    !isAtLeastOneHourAhead(booking.date, booking.startTime, now)) {
    throw error(409, 'BOOKING_DEADLINE_EXPIRED', 'Il termine per modificare la prenotazione è trascorso.');
  }
  return booking;
}

router.post('/:bookingId/participants', async (request, response) => {
  const bookingId = id(request.params.bookingId, 'INVALID_BOOKING_ID');
  const email = (() => { try { return validateEmail(request.body?.email); } catch (_) {
    throw error(400, 'VALIDATION_ERROR', 'L’email partecipante non è valida.');
  } })();
  await transaction(async db => {
    const booking = await loadEditableBooking(db, bookingId, request.user.id);
    const user = await db.get("SELECT id FROM users WHERE email = ? AND role = 'user';", [email]);
    if (!user) throw error(404, 'PARTICIPANT_NOT_FOUND', 'Il partecipante non esiste.');
    const existing = await db.get('SELECT id FROM booking_participants WHERE booking_id = ? AND user_id = ?;', [bookingId, user.id]);
    if (existing) throw error(409, 'DUPLICATE_PARTICIPANT', 'Il partecipante è già nella prenotazione.');
    const overlap = await db.get(
      `SELECT b.id FROM bookings b JOIN booking_participants bp ON bp.booking_id = b.id
        JOIN availabilities a ON a.id = b.availability_id
       WHERE bp.user_id = ? AND b.date = ? AND b.status = 'confirmed' AND a.start_time < ? AND a.end_time > ?;`,
      [user.id, booking.date, booking.endTime, booking.startTime],
    );
    if (overlap) throw error(409, 'BOOKING_OVERLAP', 'Il partecipante ha una prenotazione sovrapposta.');
    const current = romeNow();
    const limit = await db.get(
      `SELECT COUNT(*) AS count FROM bookings b JOIN booking_participants bp ON bp.booking_id = b.id
        JOIN availabilities a ON a.id = b.availability_id
        WHERE bp.user_id = ? AND b.status = 'confirmed' AND b.date || ' ' || a.start_time > ?;`,
      [user.id, `${current.date} ${current.time}`],
    );
    if (limit.count >= 5) throw error(409, 'BOOKING_LIMIT_REACHED', 'È stato raggiunto il limite di prenotazioni.');
    const occupied = await occupiedSeats(db, booking.spaceId, booking.date, booking.startTime, booking.endTime);
    const space = await db.get('SELECT capacity FROM spaces WHERE id = ?;', [booking.spaceId]);
    if (occupied >= space.capacity) throw error(409, 'INSUFFICIENT_CAPACITY', 'I posti disponibili non sono sufficienti.');
    await db.run('INSERT INTO booking_participants (booking_id, user_id, participant_role) VALUES (?, ?, \'participant\');', [bookingId, user.id]);
    await db.run("INSERT INTO notifications(user_id,type,title,message,created_at) VALUES(?,'participant_added','Aggiunto a una prenotazione',?,?)", [user.id, `Sei stato aggiunto alla prenotazione ${bookingId}.`, new Date().toISOString()]);
  });
  response.status(201).json({ data: { bookingId, email } });
});

router.delete('/:bookingId/participants/:participantId', async (request, response) => {
  const bookingId = id(request.params.bookingId, 'INVALID_BOOKING_ID');
  const participantId = id(request.params.participantId, 'INVALID_PARTICIPANT_ID');
  await transaction(async db => {
    const booking = await db.get(
      `SELECT b.id, b.date, b.status, a.start_time AS startTime FROM bookings b
        JOIN availabilities a ON a.id = b.availability_id WHERE b.id = ?;`, [bookingId],
    );
    if (!booking) throw error(404, 'BOOKING_NOT_FOUND', 'La prenotazione richiesta non esiste.');
    const now = new Date();
    const today = romeNow(now).date;
    if (booking.status !== 'confirmed' || booking.date < today ||
      !isAtLeastOneHourAhead(booking.date, booking.startTime, now)) {
      throw error(409, 'BOOKING_DEADLINE_EXPIRED', 'Il termine per modificare la prenotazione è trascorso.');
    }
    const target = await db.get('SELECT user_id AS userId, participant_role AS participantRole FROM booking_participants WHERE id = ? AND booking_id = ?;', [participantId, bookingId]);
    if (!target) throw error(404, 'PARTICIPANT_NOT_FOUND', 'Il partecipante non esiste nella prenotazione.');
    const organizer = await db.get("SELECT user_id AS userId FROM booking_participants WHERE booking_id = ? AND participant_role = 'organizer';", [bookingId]);
    if (target.participantRole === 'organizer' || (request.user.id !== organizer.userId && request.user.id !== target.userId)) {
      throw error(403, 'FORBIDDEN', 'Non puoi rimuovere questo partecipante.');
    }
    await db.run('DELETE FROM booking_participants WHERE id = ?;', [participantId]);
    const recipient = request.user.id === target.userId ? organizer.userId : target.userId;
    await db.run("INSERT INTO notifications(user_id,type,title,message,created_at) VALUES(?,'participant_removed','Partecipazione rimossa',?,?)", [recipient, `È stata rimossa una partecipazione dalla prenotazione ${bookingId}.`, new Date().toISOString()]);
  });
  response.status(204).end();
});

router.delete('/:bookingId', async (request, response) => {
  const bookingId = id(request.params.bookingId, 'INVALID_BOOKING_ID');
  await transaction(async db => {
    const booking = await loadEditableBooking(db, bookingId, request.user.id);
    const participants = await db.all('SELECT user_id AS userId FROM booking_participants WHERE booking_id = ? AND user_id <> ?;', [bookingId, request.user.id]);
    const createdAt = new Date().toISOString();
    for (const participant of participants) await db.run(
      `INSERT INTO notifications (user_id, type, title, message, created_at)
       VALUES (?, 'booking_cancelled', 'Prenotazione cancellata', 'Una prenotazione a cui partecipavi è stata cancellata.', ?);`,
      [participant.userId, createdAt],
    );
    await db.run('DELETE FROM bookings WHERE id = ?;', [bookingId]);
  });
  response.status(204).end();
});

router.post('/', async (request, response) => {
  const key = request.get('Idempotency-Key');
  if (!key || key.length > 255 || !/^[A-Za-z0-9._~-]+$/.test(key)) {
    throw error(400, 'VALIDATION_ERROR', 'Idempotency-Key obbligatoria e non valida.');
  }
  const body = request.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw error(400, 'VALIDATION_ERROR', 'I dati della prenotazione non sono validi.');
  }
  const spaceId = id(body.spaceId, 'INVALID_SPACE_ID');
  const availabilityId = id(body.availabilityId, 'INVALID_AVAILABILITY_ID');
  const date = dateInfo(body.date);
  if (!Array.isArray(body.participantEmails)) {
    throw error(400, 'VALIDATION_ERROR', 'L’elenco dei partecipanti non è valido.');
  }
  let participantEmails;
  try { participantEmails = body.participantEmails.map(validateEmail); }
  catch (e) { throw error(400, 'VALIDATION_ERROR', 'Una email partecipante non è valida.'); }
  if (new Set(participantEmails).size !== participantEmails.length) {
    throw error(409, 'DUPLICATE_PARTICIPANT', 'Un partecipante è stato indicato più volte.');
  }
  const input = { spaceId, availabilityId, date: date.value, participantEmails };
  const hash = requestHash(input);
  const nowInstant = new Date();
  const now = romeNow(nowInstant);
  const today = new Date(`${now.date}T12:00:00Z`);
  const target = new Date(`${date.value}T12:00:00Z`);
  const maxDate = new Date(today.getTime() + 30 * 86400000);
  if (date.value < now.date || target > maxDate) throw error(409, 'BOOKING_DATE_OUT_OF_RANGE', 'La data non è prenotabile.');

  const result = await transaction(async db => {
    const previous = await db.get(
      'SELECT id, request_hash AS requestHash, booking_id AS bookingId FROM booking_requests WHERE user_id = ? AND idempotency_key = ?;',
      [request.user.id, key],
    );
    if (previous) {
      if (previous.requestHash !== hash || previous.bookingId === null) throw error(409, 'CONFLICT', 'La chiave è già stata utilizzata.');
      const existing = await db.get('SELECT * FROM bookings WHERE id = ?;', [previous.bookingId]);
      if (!existing) throw error(409, 'CONFLICT', 'La chiave è già stata utilizzata.');
      return { row: existing, replay: true };
    }
    const slot = await db.get(
      `SELECT sp.capacity, sp.status, a.start_time AS startTime, a.end_time AS endTime
         FROM availabilities a JOIN spaces sp ON sp.id = a.space_id
        WHERE a.id = ? AND a.space_id = ? AND a.weekday = ? AND a.valid_from <= ? AND a.valid_until >= ? AND a.is_retired = 0;`,
      [availabilityId, spaceId, date.weekday, date.value, date.value],
    );
    if (!slot || slot.status !== 'active') throw error(409, 'SPACE_NOT_AVAILABLE', 'Lo spazio non è disponibile.');
    if (!isAtLeastOneHourAhead(date.value, slot.startTime, nowInstant)) {
      throw error(409, 'BOOKING_DEADLINE_EXPIRED', 'Il termine per prenotare è trascorso.');
    }
    const exceptional = await db.get(
      `SELECT id FROM unavailabilities WHERE space_id = ? AND date = ? AND start_time < ? AND end_time > ?;`,
      [spaceId, date.value, slot.endTime, slot.startTime],
    );
    if (exceptional) throw error(409, 'SLOT_NOT_AVAILABLE', 'La fascia non è disponibile.');
    const emails = [request.user.email, ...participantEmails];
    const placeholders = emails.map(() => '?').join(',');
    const users = await db.all(`SELECT id, email FROM users WHERE email IN (${placeholders}) AND role = 'user';`, emails);
    if (users.length !== emails.length) throw error(404, 'PARTICIPANT_NOT_FOUND', 'Un partecipante non esiste.');
    const usersByEmail = new Map(users.map(user => [user.email, user.id]));
    const userIds = emails.map(email => usersByEmail.get(email));
    const uniqueIds = new Set(userIds);
    if (uniqueIds.size !== userIds.length) throw error(409, 'DUPLICATE_PARTICIPANT', 'Un partecipante è già l’organizzatore.');
    for (const userId of userIds) {
      const limit = await db.get(
        `SELECT COUNT(*) AS count FROM bookings b JOIN booking_participants bp ON bp.booking_id = b.id
          JOIN availabilities a ON a.id = b.availability_id
         WHERE bp.user_id = ? AND b.status = 'confirmed' AND b.date || ' ' || a.start_time > ?;`,
        [userId, `${now.date} ${now.time}`],
      );
      if (limit.count >= 5) throw error(409, 'BOOKING_LIMIT_REACHED', 'È stato raggiunto il limite di prenotazioni.');
      const overlap = await db.get(
        `SELECT b.id FROM bookings b JOIN booking_participants bp ON bp.booking_id = b.id
          JOIN availabilities a ON a.id = b.availability_id
         WHERE bp.user_id = ? AND b.date = ? AND b.status = 'confirmed'
           AND a.start_time < ? AND a.end_time > ?;`, [userId, date.value, slot.endTime, slot.startTime],
      );
      if (overlap) throw error(409, 'BOOKING_OVERLAP', 'Il partecipante ha una prenotazione sovrapposta.');
    }
    const occupied = await occupiedSeats(db, spaceId, date.value, slot.startTime, slot.endTime);
    if (occupied + userIds.length > slot.capacity) throw error(409, 'INSUFFICIENT_CAPACITY', 'I posti disponibili non sono sufficienti.');
    const createdAt = new Date().toISOString();
    const booking = await db.run(
      `INSERT INTO bookings (space_id, availability_id, date, status, created_at) VALUES (?, ?, ?, 'confirmed', ?);`,
      [spaceId, availabilityId, date.value, createdAt],
    );
    await db.run('INSERT INTO booking_participants (booking_id, user_id, participant_role) VALUES (?, ?, ?);', [booking.lastId, userIds[0], 'organizer']);
    for (const userId of userIds.slice(1)) await db.run(
      'INSERT INTO booking_participants (booking_id, user_id, participant_role) VALUES (?, ?, ?);', [booking.lastId, userId, 'participant'],
    );
    for (const userId of userIds) await db.run(
      'INSERT INTO notifications(user_id,type,title,message,created_at) VALUES(?,?,?,?,?)',
      [userId, userId === request.user.id ? 'booking_created' : 'participant_added',
        'Prenotazione confermata', `Partecipi alla prenotazione ${booking.lastId}.`, createdAt],
    );
    await db.run(
      'INSERT INTO booking_requests (user_id, idempotency_key, request_hash, booking_id, created_at) VALUES (?, ?, ?, ?, ?);',
      [request.user.id, key, hash, booking.lastId, createdAt],
    );
    return { row: { id: booking.lastId, space_id: spaceId, availability_id: availabilityId, date: date.value, status: 'confirmed', created_at: createdAt }, replay: false };
  });
  response.status(result.replay ? 200 : 201).json({ data: publicBooking(result.row) });
});

module.exports = router;
