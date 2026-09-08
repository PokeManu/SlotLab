const { rateLimit } = require('../middleware/rate-limit');
const { occupiedSeats } = require('../db/occupied-seats');
const express = require('express');
const { getDatabase } = require('../db/db');
const { transaction } = require('../db/transaction');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(['/buildings', '/spaces'], requireAuth, requireRole('user'));

function query(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, parameters, (error, rows) => error ? reject(error) : resolve(rows));
  });
}

function get(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, parameters, (error, row) => error ? reject(error) : resolve(row));
  });
}

function invalidPagination() {
  return Object.assign(new Error('I parametri di paginazione non sono validi.'), {
    status: 400, code: 'VALIDATION_ERROR',
  });
}

function pagination(request) {
  const page = request.query.page === undefined ? 1 : Number(request.query.page);
  const size = request.query.size === undefined ? 20 : Number(request.query.size);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(size) || size < 1 || size > 100) {
    throw invalidPagination();
  }
  return { page, size, offset: (page - 1) * size };
}

function parseId(value, code) {
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw Object.assign(new Error('L’identificativo richiesto non è valido.'), {
      status: 400, code,
    });
  }
  return Number(value);
}

function parseBoolean(value) {
  if (value === undefined) return undefined;
  if (value === 'true') return 1;
  if (value === 'false') return 0;
  throw invalidPagination();
}

function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw Object.assign(new Error('La data richiesta non è valida.'), {
      status: 400, code: 'VALIDATION_ERROR',
    });
  }
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw Object.assign(new Error('La data richiesta non è valida.'), {
      status: 400, code: 'VALIDATION_ERROR',
    });
  }
  return { value, weekday: date.getUTCDay() || 7 };
}

function romeNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal')
    .map(part => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}

function timeMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function dateRange(days) {
  const now = romeNow();
  const start = new Date(`${now.date}T12:00:00Z`);
  return Array.from({ length: days + 1 }, (_, index) => {
    const date = new Date(start.getTime() + index * 86400000);
    return { value: date.toISOString().slice(0, 10), weekday: date.getUTCDay() || 7, today: index === 0 };
  });
}

async function qualifyingSpaces({ availableNow = false, minSeats, todayOnly = false, tomorrowOnly = false } = {}) {
  const dates = tomorrowOnly ? dateRange(1).slice(1) : dateRange(todayOnly ? 0 : 30);
  const now = romeNow();
  const spaces = await query('SELECT id, capacity, status FROM spaces WHERE status = \'active\';');
  const result = [];
  for (const space of spaces) {
    const availabilities = await query(
      `SELECT id, valid_from AS validFrom, valid_until AS validUntil, weekday, start_time AS startTime, end_time AS endTime
         FROM availabilities WHERE space_id = ? AND is_retired = 0 ORDER BY start_time, id;`, [space.id],
    );
    let match = null;
    for (const date of dates) {
      for (const slot of availabilities) {
        if (slot.weekday !== date.weekday || date.value < slot.validFrom || date.value > slot.validUntil) continue;
        if (date.value === now.date && timeMinutes(slot.startTime) <= timeMinutes(now.time) + 60) continue;
        if (date.value < now.date) continue;
        const blocked = await get(
          `SELECT id FROM unavailabilities WHERE space_id = ? AND date = ? AND start_time < ? AND end_time > ?;`,
          [space.id, date.value, slot.endTime, slot.startTime],
        );
        if (blocked) continue;
        const occupied = await occupiedSeats({ all: query }, space.id, date.value, slot.startTime, slot.endTime);
        const free = Math.max(0, space.capacity - occupied);
        if (!free) continue;
        // Con il solo filtro posti si valuta la prima fascia prenotabile.
        if (minSeats !== undefined && free < minSeats) {
          if (availableNow) continue;
          match = { excluded: true };
          break;
        }
        match = { date: date.value, startTime: slot.startTime, availableSeats: free };
        break;
      }
      if (match) break;
    }
    if (match && !match.excluded) result.push({ id: space.id, ...match });
  }
  return result;
}

function checkInWindow(date, startTime, now = romeNow()) {
  if (date !== now.date) return date < now.date ? 'expired' : 'early';
  const current = timeMinutes(now.time);
  const start = timeMinutes(startTime);
  if (current < start - 15) return 'early';
  if (current > start + 30) return 'expired';
  return null;
}

async function servicesFor(spaceIds) {
  if (spaceIds.length === 0) return new Map();
  const placeholders = spaceIds.map(() => '?').join(',');
  const rows = await query(
    `SELECT ss.space_id AS spaceId, s.code
       FROM space_services ss JOIN services s ON s.id = ss.service_id
      WHERE ss.space_id IN (${placeholders}) ORDER BY s.code;`, spaceIds,
  );
  const result = new Map();
  for (const row of rows) {
    if (!result.has(row.spaceId)) result.set(row.spaceId, []);
    result.get(row.spaceId).push(row.code);
  }
  return result;
}

function mapSpace(row, services) {
  return {
    id: row.id,
    name: row.name,
    building: { id: row.buildingId, number: row.buildingNumber, name: row.buildingName },
    floor: row.floor,
    type: row.type,
    capacity: row.capacity,
    accessible: Boolean(row.accessible),
    status: row.status,
    services: services.get(row.id) || [],
    imageType: row.type,
  };
}

router.get('/buildings', async (request, response) => {
  const rows = await query(
    `SELECT id, number, name, address, latitude, longitude
       FROM buildings ORDER BY number ASC, id ASC;`,
  );
  response.json({ data: rows });
});

router.get('/buildings/:buildingId', async (request, response) => {
  const id = parseId(request.params.buildingId, 'INVALID_BUILDING_ID');
  const row = await get(
    'SELECT id, number, name, address, latitude, longitude FROM buildings WHERE id = ?;', [id],
  );
  if (!row) throw Object.assign(new Error('L’edificio richiesto non esiste.'), {
    status: 404, code: 'BUILDING_NOT_FOUND',
  });
  response.json({ data: row });
});

async function spacesResponse(request, response, buildingId = null) {
  response.set('Cache-Control', 'no-store');
  const { page, size, offset } = pagination(request);
  const accessible = parseBoolean(request.query.accessible);
  const search = typeof request.query.search === 'string' ? request.query.search.trim() : '';
  const type = typeof request.query.type === 'string' ? request.query.type : undefined;
  const availableNow = request.query.availableNow === 'true';
  const minSeats = request.query.minSeats === undefined ? undefined : Number(request.query.minSeats);
  if (request.query.availableNow !== undefined && request.query.availableNow !== 'true' && request.query.availableNow !== 'false') throw invalidPagination();
  if (minSeats !== undefined && (!Number.isInteger(minSeats) || minSeats < 1 || minSeats > 1000)) throw invalidPagination();
  const conditions = [];
  const parameters = [];
  if (buildingId !== null) { conditions.push('sp.building_id = ?'); parameters.push(buildingId); }
  if (accessible !== undefined) { conditions.push('sp.accessible = ?'); parameters.push(accessible); }
  if (type !== undefined) {
    if (!['study_room', 'laboratory', 'meeting_room'].includes(type)) throw invalidPagination();
    conditions.push('sp.type = ?'); parameters.push(type);
  }
  if (search) {
    conditions.push('(LOWER(sp.name) LIKE LOWER(?) OR LOWER(b.name) LIKE LOWER(?) OR CAST(b.number AS TEXT) = ?)');
    parameters.push(`%${search}%`, `%${search}%`, search);
  }
  if (availableNow || minSeats !== undefined) {
    const qualifying = await qualifyingSpaces({ availableNow, minSeats });
    if (!qualifying.length) { return response.json({ data: [], pagination: { page, size, totalElements: 0, totalPages: 0 } }); }
    conditions.push(`sp.id IN (${qualifying.map(() => '?').join(',')})`);
    parameters.push(...qualifying.map(item => item.id));
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const count = await get(
    `SELECT COUNT(*) AS total FROM spaces sp JOIN buildings b ON b.id = sp.building_id ${where};`, parameters,
  );
  const rows = await query(
    `SELECT sp.id, sp.name, sp.floor, sp.type, sp.capacity, sp.accessible, sp.status,
            b.id AS buildingId, b.number AS buildingNumber, b.name AS buildingName
       FROM spaces sp JOIN buildings b ON b.id = sp.building_id ${where}
      ORDER BY sp.name ASC, sp.id ASC LIMIT ? OFFSET ?;`, [...parameters, size, offset],
  );
  const services = await servicesFor(rows.map(row => row.id));
  response.json({
    data: rows.map(row => mapSpace(row, services)),
    pagination: { page, size, totalElements: count.total, totalPages: Math.ceil(count.total / size) },
  });
}

router.get('/buildings/:buildingId/spaces', async (request, response) => {
  const id = parseId(request.params.buildingId, 'INVALID_BUILDING_ID');
  const building = await get('SELECT id FROM buildings WHERE id = ?;', [id]);
  if (!building) throw Object.assign(new Error('L’edificio richiesto non esiste.'), {
    status: 404, code: 'BUILDING_NOT_FOUND',
  });
  await spacesResponse(request, response, id);
});

router.post('/spaces/:spaceId/check-in', rateLimit({ limit: 30, windowMs: 60000, key: request => request.user.id }), async (request, response) => {
  const spaceId = parseId(request.params.spaceId, 'INVALID_SPACE_ID');
  const result = await transaction(async db => {
    const space = await db.get('SELECT id FROM spaces WHERE id = ?;', [spaceId]);
    if (!space) throw Object.assign(new Error('Lo spazio richiesto non esiste.'), {
      status: 404, code: 'SPACE_NOT_FOUND',
    });
    const bookings = await db.all(
      `SELECT b.id AS bookingId, b.date, a.start_time AS startTime, bp.present, bp.checked_in_at AS checkedInAt
         FROM bookings b JOIN availabilities a ON a.id = b.availability_id
         JOIN booking_participants bp ON bp.booking_id = b.id
        WHERE b.space_id = ? AND b.status = 'confirmed' AND bp.user_id = ?
        ORDER BY b.date ASC, a.start_time ASC;`, [spaceId, request.user.id],
    );
    if (!bookings.length) throw Object.assign(new Error('Non esiste una prenotazione per questo spazio.'), {
      status: 404, code: 'NO_BOOKING_FOR_SPACE',
    });
    const now = romeNow();
    // Una prenotazione precedente non deve nascondere quella nella finestra corrente.
    const booking = bookings.find(item => checkInWindow(item.date, item.startTime, now) === null)
      ?? bookings.find(item => checkInWindow(item.date, item.startTime, now) === 'early')
      ?? bookings[bookings.length - 1];
    if (booking.present) return { booking, repeated: true };
    const windowError = checkInWindow(booking.date, booking.startTime, now);
    if (windowError === 'early') throw Object.assign(new Error('Il check-in è troppo anticipato.'), {
      status: 409, code: 'CHECK_IN_TOO_EARLY',
    });
    if (windowError === 'expired') throw Object.assign(new Error('Il check-in è scaduto.'), {
      status: 409, code: 'CHECK_IN_EXPIRED',
    });
    const checkedInAt = new Date().toISOString();
    await db.run(
      `UPDATE booking_participants SET present = 1, checked_in_at = ?
        WHERE booking_id = ? AND user_id = ? AND present = 0;`, [checkedInAt, booking.bookingId, request.user.id],
    );
    return { booking, checkedInAt, repeated: false };
  });
  if (result.repeated) return response.json({ data: {
    result: 'already_checked_in', message: 'Accesso già registrato.', bookingId: result.booking.bookingId,
    spaceId, checkedInAt: result.booking.checkedInAt,
  } });
  response.json({ data: {
    result: 'check_in_accepted', message: 'Accesso consentito.', bookingId: result.booking.bookingId,
    spaceId, checkedInAt: result.checkedInAt,
  } });
});

router.get('/spaces/:spaceId/availability', async (request, response) => {
  const spaceId = parseId(request.params.spaceId, 'INVALID_SPACE_ID');
  const requestedDate = parseDate(request.query.date);
  const space = await get('SELECT capacity, status FROM spaces WHERE id = ?;', [spaceId]);
  if (!space) throw Object.assign(new Error('Lo spazio richiesto non esiste.'), {
    status: 404, code: 'SPACE_NOT_FOUND',
  });
  const slots = await query(
    `SELECT id AS availabilityId, start_time AS startTime, end_time AS endTime
       FROM availabilities
      WHERE space_id = ? AND weekday = ? AND valid_from <= ? AND valid_until >= ? AND is_retired = 0
      ORDER BY start_time ASC, id ASC;`,
    [spaceId, requestedDate.weekday, requestedDate.value, requestedDate.value],
  );
  const unavailable = await query(
    `SELECT start_time AS startTime, end_time AS endTime FROM unavailabilities
      WHERE space_id = ? AND date = ?;`, [spaceId, requestedDate.value],
  );
  const now = romeNow();
  const minimumStart = timeMinutes(now.time) + 60;
  const data = await Promise.all(slots.map(async slot => {
    let reason = null;
    const overlaps = unavailable.some(item => item.startTime < slot.endTime && item.endTime > slot.startTime);
    const bookedSeats = await occupiedSeats({ all: query }, spaceId, requestedDate.value, slot.startTime, slot.endTime);
    const availableSeats = Math.max(0, space.capacity - bookedSeats);
    if (space.status !== 'active') reason = 'SPACE_UNAVAILABLE';
    else if (overlaps || availableSeats === 0) reason = 'SLOT_UNAVAILABLE';
    else if (requestedDate.value < now.date || (requestedDate.value === now.date &&
      timeMinutes(slot.startTime) <= minimumStart)) reason = 'BOOKING_DEADLINE_EXPIRED';
    return { availabilityId: slot.availabilityId, date: requestedDate.value,
      startTime: slot.startTime, endTime: slot.endTime, availableSeats,
      bookable: reason === null, reason };
  }));
  response.json({ data });
});

router.get('/spaces', async (request, response) => spacesResponse(request, response));

router.get('/spaces/recommended', async (request, response) => {
  const recommendations = await qualifyingSpaces({ todayOnly: true });
  const selected = recommendations.length ? recommendations : await qualifyingSpaces({ tomorrowOnly: true });
  const rows = await query(
    `SELECT sp.id, sp.name, sp.floor, sp.type, sp.capacity, sp.accessible, sp.status,
            b.id AS buildingId, b.number AS buildingNumber, b.name AS buildingName
       FROM spaces sp JOIN buildings b ON b.id = sp.building_id WHERE sp.id IN (${selected.slice(0, 3).map(() => '?').join(',') || 'NULL'});`,
    selected.slice(0, 3).map(item => item.id),
  );
  const services = await servicesFor(rows.map(row => row.id));
  const order = new Map(selected.map((item, index) => [item.id, index]));
  rows.sort((left, right) => order.get(left.id) - order.get(right.id));
  response.json({ data: rows.map(row => mapSpace(row, services)) });
});

router.get('/spaces/:spaceId', async (request, response) => {
  const id = parseId(request.params.spaceId, 'INVALID_SPACE_ID');
  const row = await get(
    `SELECT sp.id, sp.name, sp.floor, sp.type, sp.capacity, sp.accessible, sp.status,
            b.id AS buildingId, b.number AS buildingNumber, b.name AS buildingName
       FROM spaces sp JOIN buildings b ON b.id = sp.building_id WHERE sp.id = ?;`, [id],
  );
  if (!row) throw Object.assign(new Error('Lo spazio richiesto non esiste.'), {
    status: 404, code: 'SPACE_NOT_FOUND',
  });
  response.json({ data: mapSpace(row, await servicesFor([id])) });
});

module.exports = router;
