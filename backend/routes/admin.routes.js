const { occupiedSeats } = require('../db/occupied-seats');
const { sendReportPhoto, photoName, cleanDeletedFiles } = require('../security/report-files');
const express = require('express');
const { getDatabase } = require('../db/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { transaction } = require('../db/transaction');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

function all(sql, values = []) {
  return new Promise((resolve, reject) => getDatabase().all(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));
}
function get(sql, values = []) {
  return new Promise((resolve, reject) => getDatabase().get(sql, values, (error, row) => error ? reject(error) : resolve(row)));
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0,10) === value;
}
function validTime(value) { return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value); }

async function queuePhotos(db, photos) {
  for (const photo of photos) await db.run('INSERT OR IGNORE INTO file_deletions(filename,created_at) VALUES(?,?)',
    [photoName(photo.photo_path), new Date().toISOString()]);
}
async function cleanupPhotos() {
  await cleanDeletedFiles().catch(() => console.error('Pulizia fotografie da riprovare.'));
}
async function prepareSpaceDeletion(db, id) {
  const users = await db.all(`SELECT DISTINCT bp.user_id AS id FROM bookings b
    JOIN availabilities a ON a.id=b.availability_id JOIN booking_participants bp ON bp.booking_id=b.id
    WHERE b.space_id=? AND b.status='confirmed' AND b.date || ' ' || a.start_time > ?`, [id, romeDateTime()]);
  for (const user of users) await db.run("INSERT INTO notifications(user_id,type,title,message,created_at) VALUES(?,'space_unavailable','Prenotazione cancellata','Lo spazio della prenotazione è stato eliminato.',?)", [user.id,new Date().toISOString()]);
  await queuePhotos(db, await db.all('SELECT photo_path FROM reports WHERE space_id=? AND photo_path IS NOT NULL',[id]));
}
function romeDateTime() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('sv-SE',{ timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).formatToParts(new Date()).map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

router.post('/announcements', async (request, response) => {
  const body = request.body;
  if (!body || Array.isArray(body) || typeof body.title !== 'string' || !body.title.trim() ||
      typeof body.message !== 'string' || !body.message.trim() ||
      Object.keys(body).some(key => !['title', 'message'].includes(key))) {
    throw Object.assign(new Error('Inserisci titolo e messaggio dell’avviso.'), { status: 400, code: 'VALIDATION_ERROR' });
  }
  const title = body.title.trim();
  const message = body.message.trim();
  const createdAt = new Date().toISOString();
  const data = await transaction(async db => {
    const announcement = await db.run(
      'INSERT INTO announcements (author_id, title, message, created_at) VALUES (?, ?, ?, ?);',
      [request.user.id, title, message, createdAt],
    );
    const delivered = await db.run(
      `INSERT INTO notifications (user_id, announcement_id, type, title, message, created_at)
       SELECT id, ?, 'global_announcement', ?, ?, ? FROM users WHERE role = 'user';`,
      [announcement.lastId, title, message, createdAt],
    );
    return { id: announcement.lastId, title, message, createdAt, recipientCount: delivered.changes };
  });
  response.status(201).json({ data });
});

router.get('/summary', async (request, response) => {
  const row = await get(`SELECT
    (SELECT COUNT(*) FROM bookings WHERE date = date('now', 'localtime')) AS bookingCount,
    (SELECT COUNT(*) FROM spaces) AS spaceCount,
    (SELECT COUNT(*) FROM spaces WHERE status = 'active') AS availableSpaceCount,
    (SELECT COUNT(*) FROM reports WHERE status <> 'resolved') AS openReportCount;`);
  response.json({ data: {
    bookingCount: Number(row.bookingCount),
    spaceCount: Number(row.spaceCount),
    availableSpaceCount: Number(row.availableSpaceCount),
    openReportCount: Number(row.openReportCount),
  } });
});

router.get('/buildings', async (request, response) => {
  response.json({ data: await all('SELECT id, number, name, address, latitude, longitude FROM buildings ORDER BY number, id;') });
});

router.get('/buildings/:buildingId', async (request, response) => {
  const id = Number(request.params.buildingId);
  if (!Number.isInteger(id) || id < 1) throw Object.assign(new Error('Identificativo edificio non valido.'), { status: 400, code: 'INVALID_BUILDING_ID' });
  const row = await new Promise((resolve, reject) => getDatabase().get('SELECT id, number, name, address, latitude, longitude FROM buildings WHERE id = ?;', [id], (error, value) => error ? reject(error) : resolve(value)));
  if (!row) throw Object.assign(new Error('L’edificio richiesto non esiste.'), { status: 404, code: 'BUILDING_NOT_FOUND' });
  response.json({ data: row });
});

router.post('/buildings', async (request, response) => {
  const body = request.body;
  const number = Number(body?.number);
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  if (!Number.isInteger(number) || number < 1 || typeof body?.name !== 'string' || !body.name.trim() ||
      typeof body?.address !== 'string' || !body.address.trim() || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw Object.assign(new Error('I dati dell’edificio non sono validi.'), { status: 400, code: 'VALIDATION_ERROR' });
  }
  try {
    const created = await new Promise((resolve, reject) => getDatabase().run(
      'INSERT INTO buildings (number, name, address, latitude, longitude) VALUES (?, ?, ?, ?, ?);',
      [number, body.name.trim(), body.address.trim(), latitude, longitude], function onInsert(error) { error ? reject(error) : resolve(this.lastID); },
    ));
    response.status(201).json({ data: { id: created, number, name: body.name.trim(), address: body.address.trim(), latitude, longitude } });
  } catch (cause) {
    if (cause.code === 'SQLITE_CONSTRAINT') throw Object.assign(new Error('Il numero ufficiale è già utilizzato.'), { status: 409, code: 'BUILDING_NUMBER_ALREADY_EXISTS' });
    throw cause;
  }
});

router.patch('/buildings/:buildingId', async (request, response) => {
  const id = Number(request.params.buildingId);
  if (!Number.isInteger(id) || id < 1) throw Object.assign(new Error('Identificativo edificio non valido.'), { status: 400, code: 'INVALID_BUILDING_ID' });
  const allowed = ['number', 'name', 'address', 'latitude', 'longitude'];
  const body = request.body || {};
  const keys = Object.keys(body);
  if (!keys.length || keys.some(key => !allowed.includes(key))) throw Object.assign(new Error('Dati edificio non validi.'), { status: 400, code: 'VALIDATION_ERROR' });
  const current = await new Promise((resolve, reject) => getDatabase().get('SELECT id, number, name, address, latitude, longitude FROM buildings WHERE id = ?;', [id], (error, row) => error ? reject(error) : resolve(row)));
  if (!current) throw Object.assign(new Error('L’edificio richiesto non esiste.'), { status: 404, code: 'BUILDING_NOT_FOUND' });
  const next = { ...current, ...body };
  if (!Number.isInteger(Number(next.number)) || Number(next.number) < 1 || typeof next.name !== 'string' || !next.name.trim() || typeof next.address !== 'string' || !next.address.trim() || !Number.isFinite(Number(next.latitude)) || Number(next.latitude) < -90 || Number(next.latitude) > 90 || !Number.isFinite(Number(next.longitude)) || Number(next.longitude) < -180 || Number(next.longitude) > 180) throw Object.assign(new Error('Dati edificio non validi.'), { status: 400, code: 'VALIDATION_ERROR' });
  try {
    await new Promise((resolve, reject) => getDatabase().run(
      'UPDATE buildings SET number = ?, name = ?, address = ?, latitude = ?, longitude = ? WHERE id = ?;',
      [Number(next.number), next.name.trim(), next.address.trim(), Number(next.latitude), Number(next.longitude), id], error => error ? reject(error) : resolve(),
    ));
  } catch (cause) {
    if (cause.code === 'SQLITE_CONSTRAINT') throw Object.assign(new Error('Il numero ufficiale è già utilizzato.'), { status: 409, code: 'BUILDING_NUMBER_ALREADY_EXISTS' });
    throw cause;
  }
  response.json({ data: { id, number: Number(next.number), name: next.name.trim(), address: next.address.trim(), latitude: Number(next.latitude), longitude: Number(next.longitude) } });
});

router.delete('/buildings/:buildingId', async (request, response) => {
  const id = Number(request.params.buildingId);
  if (!Number.isInteger(id) || id < 1) throw Object.assign(new Error('Identificativo edificio non valido.'), { status: 400, code: 'INVALID_BUILDING_ID' });
  await transaction(async db => {
    const building = await db.get('SELECT id FROM buildings WHERE id = ?;', [id]);
    if (!building) throw Object.assign(new Error('L’edificio richiesto non esiste.'), { status: 404, code: 'BUILDING_NOT_FOUND' });
    for (const space of await db.all('SELECT id FROM spaces WHERE building_id=?',[id])) await prepareSpaceDeletion(db,space.id);
    await db.run('DELETE FROM buildings WHERE id = ?;', [id]);
  });
  await cleanupPhotos();
  response.status(204).end();
});

router.get('/spaces', async (request, response) => {
  const page = request.query.page === undefined ? 1 : Number(request.query.page);
  const size = request.query.size === undefined ? 20 : Number(request.query.size);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(size) || size < 1 || size > 100) {
    throw Object.assign(new Error('I parametri di paginazione non sono validi.'), { status: 400, code: 'VALIDATION_ERROR' });
  }
  const where = typeof request.query.search === 'string' && request.query.search.trim()
    ? 'WHERE sp.name LIKE ? OR b.name LIKE ? OR CAST(b.number AS TEXT) = ?' : '';
  const search = typeof request.query.search === 'string' ? request.query.search.trim() : '';
  const values = where ? [`%${search}%`, `%${search}%`, search] : [];
  const total = await new Promise((resolve, reject) => getDatabase().get(`SELECT COUNT(*) AS count FROM spaces sp JOIN buildings b ON b.id = sp.building_id ${where};`, values, (error, row) => error ? reject(error) : resolve(row.count)));
  const rows = await all(
    `SELECT sp.id, sp.name, sp.floor, sp.type, sp.capacity, sp.accessible, sp.status,
            b.id AS buildingId, b.number AS buildingNumber, b.name AS buildingName
       FROM spaces sp JOIN buildings b ON b.id = sp.building_id ${where}
      ORDER BY sp.name, sp.id LIMIT ? OFFSET ?;`, [...values, size, (page - 1) * size],
  );
  response.json({ data: rows.map(row => ({ id: row.id, name: row.name,
    building: { id: row.buildingId, number: row.buildingNumber, name: row.buildingName },
    floor: row.floor, type: row.type, capacity: row.capacity, accessible: Boolean(row.accessible), status: row.status })),
  pagination: { page, size, totalElements: total, totalPages: Math.ceil(total / size) } });
});

router.get('/spaces/:spaceId', async (request, response) => {
  const id = Number(request.params.spaceId);
  if (!Number.isInteger(id) || id < 1) throw Object.assign(new Error('Identificativo spazio non valido.'), { status: 400, code: 'INVALID_SPACE_ID' });
  const row = await new Promise((resolve, reject) => getDatabase().get(
    `SELECT sp.id, sp.name, sp.floor, sp.type, sp.capacity, sp.accessible, sp.status,
            b.id AS buildingId, b.number AS buildingNumber, b.name AS buildingName
       FROM spaces sp JOIN buildings b ON b.id = sp.building_id WHERE sp.id = ?;`, [id], (error, value) => error ? reject(error) : resolve(value),
  ));
  if (!row) throw Object.assign(new Error('Lo spazio richiesto non esiste.'), { status: 404, code: 'SPACE_NOT_FOUND' });
  const serviceRows = await all('SELECT code FROM services JOIN space_services ss ON ss.service_id=services.id WHERE ss.space_id=? ORDER BY code',[id]);
  response.json({ data: { id: row.id, name: row.name, building: { id: row.buildingId, number: row.buildingNumber, name: row.buildingName }, floor: row.floor, type: row.type, capacity: row.capacity, accessible: Boolean(row.accessible), status: row.status, serviceCodes: serviceRows.map(s => s.code) } });
});

router.post('/spaces', async (request, response) => {
  const body = request.body || {};
  const validTypes = ['study_room', 'laboratory', 'meeting_room'];
  const validStatuses = ['active', 'maintenance', 'deactivated'];
  const serviceCodes = Array.isArray(body.serviceCodes) ? [...new Set(body.serviceCodes)] : [];
  if (typeof body.name !== 'string' || !body.name.trim() || !Number.isInteger(Number(body.buildingId)) || Number(body.buildingId) < 1 || !Number.isInteger(Number(body.floor)) || !validTypes.includes(body.type) || !Number.isInteger(Number(body.capacity)) || Number(body.capacity) < 1 || ![true, false, 0, 1].includes(body.accessible) || !validStatuses.includes(body.status) || serviceCodes.some(code => !['wifi', 'power_outlets', 'projector', 'computer', 'air_conditioning'].includes(code))) {
    throw Object.assign(new Error('I dati dello spazio non sono validi.'), { status: 400, code: 'VALIDATION_ERROR' });
  }
  const created = await transaction(async db => {
    const building = await db.get('SELECT id FROM buildings WHERE id = ?;', [Number(body.buildingId)]);
    if (!building) throw Object.assign(new Error('L’edificio richiesto non esiste.'), { status: 404, code: 'BUILDING_NOT_FOUND' });
    const row = await db.run(
      `INSERT INTO spaces (building_id, name, floor, type, capacity, accessible, status) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [Number(body.buildingId), body.name.trim(), Number(body.floor), body.type, Number(body.capacity), Boolean(body.accessible) ? 1 : 0, body.status],
    );
    for (const code of serviceCodes) {
      const service = await db.get('SELECT id FROM services WHERE code = ?;', [code]);
      if (service) await db.run('INSERT INTO space_services (space_id, service_id) VALUES (?, ?);', [row.lastId, service.id]);
    }
    return row.lastId;
  });
  response.status(201).json({ data: { id: created } });
});

router.patch('/spaces/:spaceId', async (request, response) => {
  const id = Number(request.params.spaceId);
  if (!Number.isInteger(id) || id < 1) throw Object.assign(new Error('Identificativo spazio non valido.'), { status: 400, code: 'INVALID_SPACE_ID' });
  const current = await new Promise((resolve, reject) => getDatabase().get('SELECT * FROM spaces WHERE id = ?;', [id], (error, row) => error ? reject(error) : resolve(row)));
  if (!current) throw Object.assign(new Error('Lo spazio richiesto non esiste.'), { status: 404, code: 'SPACE_NOT_FOUND' });
  const body = request.body || {};
  if (body.serviceCodes !== undefined && (!Array.isArray(body.serviceCodes) || body.serviceCodes.some(code => !['wifi','power_outlets','projector','computer','air_conditioning'].includes(code)))) throw Object.assign(new Error('Servizi non validi.'),{status:400,code:'VALIDATION_ERROR'});
  const next = { ...current, ...body };
  if (typeof next.name !== 'string' || !next.name.trim() || !Number.isInteger(Number(body.buildingId ?? current.building_id)) || !Number.isInteger(Number(next.floor)) || !['study_room', 'laboratory', 'meeting_room'].includes(next.type) || !Number.isInteger(Number(next.capacity)) || Number(next.capacity) < 1 || !['active', 'maintenance', 'deactivated'].includes(next.status)) throw Object.assign(new Error('Dati dello spazio non validi.'), { status: 400, code: 'VALIDATION_ERROR' });
  await transaction(async db => {
    if (body.serviceCodes !== undefined) {
      await db.run('DELETE FROM space_services WHERE space_id=?',[id]);
      for (const code of new Set(body.serviceCodes)) await db.run('INSERT INTO space_services(space_id,service_id) SELECT ?,id FROM services WHERE code=?',[id,code]);
    }
    const capacity = Number(next.capacity);
    if (capacity < current.capacity) {
      const intervals = await db.all(`SELECT DISTINCT b.date,a.start_time AS startTime,a.end_time AS endTime
        FROM bookings b JOIN availabilities a ON a.id=b.availability_id
        WHERE b.space_id=? AND b.status='confirmed' AND b.date || ' ' || a.end_time > ?`,[id,romeDateTime()]);
      for (const interval of intervals) {
        if (await occupiedSeats(db,id,interval.date,interval.startTime,interval.endTime) > capacity)
          throw Object.assign(new Error('La nuova capienza è inferiore ai posti già prenotati.'), { status:409,code:'CAPACITY_REDUCTION_CONFLICT' });
      }
    }
    const statusChanged = current.status === 'active' && next.status !== 'active';
    if (statusChanged) {
      const participants = await db.all(
        `SELECT DISTINCT bp.user_id AS userId FROM booking_participants bp JOIN bookings b ON b.id = bp.booking_id JOIN availabilities a ON a.id=b.availability_id
          WHERE b.space_id = ? AND b.status = 'confirmed' AND b.date || ' ' || a.start_time > ?;`, [id,romeDateTime()],
      );
      const createdAt = new Date().toISOString();
      for (const participant of participants) await db.run(
        `INSERT INTO notifications (user_id, type, title, message, created_at)
         VALUES (?, 'space_unavailable', 'Prenotazione cancellata', 'Una prenotazione è stata cancellata perché lo spazio non è disponibile.', ?);`, [participant.userId, createdAt],
      );
      await db.run("DELETE FROM bookings WHERE space_id = ? AND status = 'confirmed' AND date || ' ' || (SELECT start_time FROM availabilities WHERE id=bookings.availability_id) > ?;", [id,romeDateTime()]);
    }
    await db.run(
      `UPDATE spaces SET building_id = ?, name = ?, floor = ?, type = ?, capacity = ?, accessible = ?, status = ? WHERE id = ?;`,
      [Number(body.buildingId ?? current.building_id), next.name.trim(), Number(next.floor), next.type, capacity, Boolean(next.accessible) ? 1 : 0, next.status, id],
    );
  });
  response.json({ data: { id, name: next.name.trim(), floor: Number(next.floor), type: next.type, capacity: Number(next.capacity), accessible: Boolean(next.accessible), status: next.status } });
});

router.delete('/spaces/:spaceId', async (request, response) => {
  const id = Number(request.params.spaceId);
  if (!Number.isInteger(id) || id < 1) throw Object.assign(new Error('Identificativo spazio non valido.'), { status: 400, code: 'INVALID_SPACE_ID' });
  await transaction(async db => {
    const space = await db.get('SELECT id FROM spaces WHERE id = ?;', [id]);
    if (!space) throw Object.assign(new Error('Lo spazio richiesto non esiste.'), { status: 404, code: 'SPACE_NOT_FOUND' });
    await prepareSpaceDeletion(db,id);
    await db.run('DELETE FROM spaces WHERE id = ?;', [id]);
  });
  await cleanupPhotos();
  response.status(204).end();
});

router.get('/spaces/:spaceId/availability', async (request, response) => {
  const spaceId = Number(request.params.spaceId);
  if (!Number.isInteger(spaceId) || spaceId < 1) throw Object.assign(new Error('Identificativo spazio non valido.'), { status: 400, code: 'INVALID_SPACE_ID' });
  const rows = await all(
    `SELECT id AS availabilityId, valid_from AS validFrom, valid_until AS validUntil, weekday,
            start_time AS startTime, end_time AS endTime, is_retired AS isRetired
       FROM availabilities WHERE space_id = ? ORDER BY valid_from, weekday, start_time, id;`, [spaceId],
  );
  response.json({ data: rows.map(row => ({ ...row, isRetired: Boolean(row.isRetired) })) });
});

router.post('/spaces/:spaceId/availability', async (request, response) => {
  const spaceId = Number(request.params.spaceId);
  const body = request.body || {};
  if (!Number.isInteger(spaceId) || spaceId < 1 || !validDate(body.validFrom) || !validDate(body.validUntil) || body.validUntil < body.validFrom || !Number.isInteger(Number(body.weekday)) || Number(body.weekday) < 1 || Number(body.weekday) > 7 || !validTime(body.startTime) || !validTime(body.endTime) || body.endTime <= body.startTime) throw Object.assign(new Error('Dati disponibilità non validi.'), { status: 400, code: 'VALIDATION_ERROR' });
  const created = await transaction(async db => {
    const space = await db.get('SELECT id FROM spaces WHERE id = ?;', [spaceId]);
    if (!space) throw Object.assign(new Error('Lo spazio richiesto non esiste.'), { status: 404, code: 'SPACE_NOT_FOUND' });
    const overlap = await db.get(
      `SELECT id FROM availabilities WHERE space_id = ? AND is_retired = 0 AND weekday = ?
       AND valid_from <= ? AND valid_until >= ? AND start_time < ? AND end_time > ?;`,
      [spaceId, Number(body.weekday), body.validUntil, body.validFrom, body.endTime, body.startTime],
    );
    if (overlap) throw Object.assign(new Error('La fascia si sovrappone a una configurazione attiva.'), { status: 409, code: 'AVAILABILITY_OVERLAP' });
    const result = await db.run(
      `INSERT INTO availabilities (space_id, valid_from, valid_until, weekday, start_time, end_time, is_retired)
       VALUES (?, ?, ?, ?, ?, ?, 0);`, [spaceId, body.validFrom, body.validUntil, Number(body.weekday), body.startTime, body.endTime],
    );
    return result.lastId;
  });
  response.status(201).json({ data: { availabilityId: created, spaceId, validFrom: body.validFrom, validUntil: body.validUntil, weekday: Number(body.weekday), startTime: body.startTime, endTime: body.endTime, isRetired: false } });
});

router.get('/spaces/:spaceId/unavailability', async (request, response) => {
  const spaceId = Number(request.params.spaceId);
  if (!Number.isInteger(spaceId) || spaceId < 1) throw Object.assign(new Error('Identificativo spazio non valido.'), { status: 400, code: 'INVALID_SPACE_ID' });
  response.json({ data: await all(
    `SELECT id, date, start_time AS startTime, end_time AS endTime, reason
       FROM unavailabilities WHERE space_id = ? ORDER BY date, start_time, id;`, [spaceId],
  ) });
});

router.post('/spaces/:spaceId/unavailability', async (request, response) => {
  const spaceId = Number(request.params.spaceId);
  const body = request.body || {};
  if (!Number.isInteger(spaceId) || spaceId < 1 || !validDate(body.date) || !validTime(body.startTime) || !validTime(body.endTime) || body.endTime <= body.startTime || typeof body.reason !== 'string' || !body.reason.trim()) throw Object.assign(new Error('Dati indisponibilità non validi.'), { status: 400, code: 'VALIDATION_ERROR' });
  await transaction(async db => {
    const space = await db.get('SELECT id FROM spaces WHERE id = ?;', [spaceId]);
    if (!space) throw Object.assign(new Error('Lo spazio richiesto non esiste.'), { status: 404, code: 'SPACE_NOT_FOUND' });
    const conflicts = await db.all(
      `SELECT DISTINCT bp.user_id AS userId FROM bookings b JOIN booking_participants bp ON bp.booking_id = b.id
        JOIN availabilities a ON a.id = b.availability_id
       WHERE b.space_id = ? AND b.date = ? AND b.status = 'confirmed' AND a.start_time < ? AND a.end_time > ?;`,
      [spaceId, body.date, body.endTime, body.startTime],
    );
    const createdAt = new Date().toISOString();
    for (const participant of conflicts) await db.run(
      `INSERT INTO notifications (user_id, type, title, message, created_at)
       VALUES (?, 'space_unavailable', 'Fascia non disponibile', 'La prenotazione è stata cancellata per indisponibilità dello spazio.', ?);`, [participant.userId, createdAt],
    );
    await db.run(
      `DELETE FROM bookings WHERE space_id = ? AND date = ? AND status = 'confirmed' AND availability_id IN
       (SELECT id FROM availabilities WHERE start_time < ? AND end_time > ?);`, [spaceId, body.date, body.endTime, body.startTime],
    );
    await db.run(
      'INSERT INTO unavailabilities (space_id, date, start_time, end_time, reason) VALUES (?, ?, ?, ?, ?);',
      [spaceId, body.date, body.startTime, body.endTime, body.reason.trim()],
    );
  });
  response.status(201).json({ data: { spaceId, date: body.date, startTime: body.startTime, endTime: body.endTime, reason: body.reason.trim() } });
});

router.patch('/spaces/:spaceId/availability/:availabilityId', async (request, response) => {
  const spaceId = Number(request.params.spaceId); const availabilityId = Number(request.params.availabilityId);
  const body = request.body || {};
  if (!Number.isInteger(spaceId) || !Number.isInteger(availabilityId) || !validDate(body.validFrom) || !validDate(body.validUntil) || body.validUntil < body.validFrom || !Number.isInteger(Number(body.weekday)) || Number(body.weekday) < 1 || Number(body.weekday) > 7 || !validTime(body.startTime) || !validTime(body.endTime) || body.endTime <= body.startTime) throw Object.assign(new Error('Dati disponibilità non validi.'), { status: 400, code: 'VALIDATION_ERROR' });
  const created = await transaction(async db => {
    const current = await db.get('SELECT id FROM availabilities WHERE id = ? AND space_id = ? AND is_retired = 0;', [availabilityId, spaceId]);
    if (!current) throw Object.assign(new Error('La disponibilità richiesta non esiste.'), { status: 404, code: 'AVAILABILITY_NOT_FOUND' });
    const overlap = await db.get(
      `SELECT id FROM availabilities WHERE space_id = ? AND id <> ? AND is_retired = 0 AND weekday = ?
       AND valid_from <= ? AND valid_until >= ? AND start_time < ? AND end_time > ?;`,
      [spaceId, availabilityId, Number(body.weekday), body.validUntil, body.validFrom, body.endTime, body.startTime],
    );
    if (overlap) throw Object.assign(new Error('La fascia si sovrappone a una configurazione attiva.'), { status: 409, code: 'AVAILABILITY_OVERLAP' });
    await db.run('UPDATE availabilities SET is_retired = 1 WHERE id = ?;', [availabilityId]);
    const replacement = await db.run(
      `INSERT INTO availabilities (space_id, valid_from, valid_until, weekday, start_time, end_time, is_retired)
       VALUES (?, ?, ?, ?, ?, ?, 0);`, [spaceId, body.validFrom, body.validUntil, Number(body.weekday), body.startTime, body.endTime],
    );
    return replacement.lastId;
  });
  response.json({ data: { availabilityId: created, spaceId, validFrom: body.validFrom, validUntil: body.validUntil, weekday: Number(body.weekday), startTime: body.startTime, endTime: body.endTime, isRetired: false } });
});

router.delete('/spaces/:spaceId/availability/:availabilityId', async (request, response) => {
  const spaceId = Number(request.params.spaceId); const availabilityId = Number(request.params.availabilityId);
  await transaction(async db => {
    const result = await db.run('UPDATE availabilities SET is_retired = 1 WHERE id = ? AND space_id = ? AND is_retired = 0;', [availabilityId, spaceId]);
    if (!result.changes) throw Object.assign(new Error('La disponibilità richiesta non esiste.'), { status: 404, code: 'AVAILABILITY_NOT_FOUND' });
  });
  response.status(204).end();
});

router.delete('/spaces/:spaceId/unavailability/:unavailabilityId', async (request, response) => {
  const spaceId = Number(request.params.spaceId); const unavailabilityId = Number(request.params.unavailabilityId);
  const result = await new Promise((resolve, reject) => getDatabase().run('DELETE FROM unavailabilities WHERE id = ? AND space_id = ?;', [unavailabilityId, spaceId], function onDelete(error) { error ? reject(error) : resolve(this.changes); }));
  if (!result) throw Object.assign(new Error('L’indisponibilità richiesta non esiste.'), { status: 404, code: 'UNAVAILABILITY_NOT_FOUND' });
  response.status(204).end();
});

router.get('/statistics', async (request, response) => {
  const from = typeof request.query.from === 'string' ? request.query.from : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const until = typeof request.query.until === 'string' ? request.query.until : new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(until) || from > until) throw Object.assign(new Error('Periodo non valido.'), { status: 400, code: 'VALIDATION_ERROR' });
  const totals = await get(`SELECT
      (SELECT COUNT(*) FROM bookings b WHERE b.date BETWEEN ? AND ?) AS bookings,
      (SELECT COALESCE(SUM(o.offered_capacity), 0) FROM slot_occurrences o WHERE o.finalized_at IS NOT NULL AND o.was_offered = 1 AND o.date BETWEEN ? AND ?) AS offeredCapacity,
      (SELECT COUNT(*) FROM booking_participants bp JOIN bookings b ON b.id = bp.booking_id WHERE b.date BETWEEN ? AND ? AND bp.present = 1) AS presences,
      (SELECT COUNT(*) FROM booking_participants bp JOIN bookings b ON b.id = bp.booking_id WHERE b.date BETWEEN ? AND ?) AS participants;`, [from, until, from, until, from, until, from, until]);
  const daily = await all(`SELECT o.date AS date, COUNT(DISTINCT b.id) AS bookings FROM slot_occurrences o LEFT JOIN bookings b ON b.space_id = o.space_id AND b.date = o.date
    LEFT JOIN availabilities a ON a.id = b.availability_id AND a.start_time = o.start_time AND a.end_time = o.end_time
    WHERE o.finalized_at IS NOT NULL AND o.was_offered = 1 AND o.date BETWEEN ? AND ? GROUP BY o.date ORDER BY o.date;`, [from, until]);
  const usageRows = await all(`SELECT s.type, COUNT(*) AS presences
    FROM booking_participants bp JOIN bookings b ON b.id = bp.booking_id JOIN spaces s ON s.id = b.space_id
    WHERE b.date BETWEEN ? AND ? AND bp.present = 1 AND EXISTS (
      SELECT 1 FROM slot_occurrences o JOIN availabilities a ON a.id = b.availability_id
      WHERE o.space_id = b.space_id AND o.date = b.date AND o.start_time = a.start_time AND o.end_time = a.end_time
        AND o.finalized_at IS NOT NULL AND o.was_offered = 1
    ) GROUP BY s.type;`, [from, until]);
  const usageTotal = usageRows.reduce((sum, row) => sum + Number(row.presences), 0);
  const usage = usageRows.map(row => ({ type: row.type, percentage: usageTotal ? Math.round((Number(row.presences) / usageTotal) * 100) : 0 }));
  response.json({ data: { from, until, bookings: totals.bookings, offeredCapacity: totals.offeredCapacity, presences: totals.presences, participants: totals.participants, utilizationRate: totals.offeredCapacity ? Math.round((totals.presences / totals.offeredCapacity) * 100) : 0, checkInRate: totals.participants ? Math.round((totals.presences / totals.participants) * 100) : 0, daily, usage } });
});

router.get('/bookings', async (request, response) => {
  const page = request.query.page === undefined ? 1 : Number(request.query.page);
  const size = request.query.size === undefined ? 20 : Number(request.query.size);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(size) || size < 1 || size > 100) throw Object.assign(new Error('I parametri di paginazione non sono validi.'), { status: 400, code: 'VALIDATION_ERROR' });
  const total = await get('SELECT COUNT(*) AS total FROM bookings;');
  const rows = await all(
    `SELECT b.id, b.date, b.status, b.created_at AS createdAt, s.id AS spaceId, s.name AS spaceName,
            bu.name AS building, s.floor, a.start_time AS startTime, a.end_time AS endTime,
            COUNT(bp.id) AS participantCount,
            MAX(CASE WHEN bp.participant_role = 'organizer' THEN u.first_name || ' ' || u.last_name END) AS organizerName
       FROM bookings b JOIN spaces s ON s.id = b.space_id JOIN buildings bu ON bu.id = s.building_id
       JOIN availabilities a ON a.id = b.availability_id LEFT JOIN booking_participants bp ON bp.booking_id = b.id
       LEFT JOIN users u ON u.id = bp.user_id
      GROUP BY b.id ORDER BY b.date DESC, b.id DESC LIMIT ? OFFSET ?;`, [size, (page - 1) * size],
  );
  const now = romeDateTime();
  for (const row of rows) {
    if (`${row.date} ${row.endTime}` <= now) row.status = 'completed';
    row.participants = await all(`SELECT u.id,u.first_name AS firstName,u.last_name AS lastName,u.email,
      bp.participant_role AS participantRole,bp.present,bp.checked_in_at AS checkedInAt
      FROM booking_participants bp JOIN users u ON u.id=bp.user_id WHERE bp.booking_id=? ORDER BY bp.id`,[row.id]);
    row.participants = row.participants.map(person => ({ ...person,present:Boolean(person.present) }));
  }
  response.json({ data: rows, pagination: { page, size, totalElements: total.total, totalPages: Math.ceil(total.total / size) } });
});

router.get('/reports', async (request, response) => {
  const rows = await all(
    `SELECT r.id, r.space_id AS spaceId, s.name AS spaceName, r.category, r.description,
            r.priority, r.status, r.photo_path AS photoPath, r.created_at AS createdAt, r.updated_at AS updatedAt,
            u.email AS authorEmail
       FROM reports r JOIN spaces s ON s.id = r.space_id JOIN users u ON u.id = r.user_id
      ORDER BY r.created_at DESC, r.id DESC;`,
  );
  response.json({ data: rows });
});

router.get('/reports/:reportId/photo', async (request, response) => {
  const id = Number(request.params.reportId);
  if (!Number.isSafeInteger(id) || id < 1) throw Object.assign(new Error('Identificativo segnalazione non valido.'), { status: 400 });
  const report = await get('SELECT photo_path AS photo FROM reports WHERE id = ?;', [id]);
  if (!report?.photo) throw Object.assign(new Error('Foto non disponibile.'), { status: 404, code: 'PHOTO_NOT_FOUND' });
  await sendReportPhoto(report.photo, response);
});

router.patch('/reports/:reportId/status', async (request, response) => {
  const id = Number(request.params.reportId);
  const nextStatus = request.body?.status;
  if (!Number.isInteger(id) || id < 1 || !['in_progress', 'resolved'].includes(nextStatus)) throw Object.assign(new Error('Stato segnalazione non valido.'), { status: 400, code: 'INVALID_REPORT_STATUS' });
  await transaction(async db => {
    const report = await db.get('SELECT id, user_id AS userId, status FROM reports WHERE id = ?;', [id]);
    if (!report) throw Object.assign(new Error('La segnalazione richiesta non esiste.'), { status: 404, code: 'REPORT_NOT_FOUND' });
    if ((report.status === 'open' && !['in_progress', 'resolved'].includes(nextStatus)) || (report.status === 'in_progress' && nextStatus !== 'resolved') || report.status === 'resolved') throw Object.assign(new Error('Transizione di stato non consentita.'), { status: 409, code: 'INVALID_REPORT_STATUS_TRANSITION' });
    const updatedAt = new Date().toISOString();
    await db.run('UPDATE reports SET status = ?, updated_at = ? WHERE id = ?;', [nextStatus, updatedAt, id]);
    await db.run(
      `INSERT INTO notifications (user_id, type, title, message, created_at)
       VALUES (?, 'report_updated', 'Segnalazione aggiornata', ?, ?);`,
      [report.userId, `La tua segnalazione è ora ${nextStatus === 'in_progress' ? 'in lavorazione' : 'risolta'}.`, updatedAt],
    );
  });
  response.json({ data: { id, status: nextStatus } });
});

router.get('/users', async (request, response) => {
  const page = request.query.page === undefined ? 1 : Number(request.query.page);
  const size = request.query.size === undefined ? 20 : Number(request.query.size);
  const search = typeof request.query.search === 'string' ? request.query.search.trim() : '';
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(size) || size < 1 || size > 100) throw Object.assign(new Error('I parametri di paginazione non sono validi.'), { status: 400, code: 'VALIDATION_ERROR' });
  const where = search ? "AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)" : '';
  const values = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
  const total = await getDatabase().get(`SELECT COUNT(*) AS total FROM users u WHERE 1 = 1 ${where};`, values);
  const rows = await all(
    `SELECT u.id, u.first_name AS firstName, u.last_name AS lastName, u.email, u.role, u.created_at AS createdAt
       FROM users u WHERE 1 = 1 ${where} ORDER BY u.last_name, u.first_name, u.id LIMIT ? OFFSET ?;`, [...values, size, (page - 1) * size],
  );
  response.json({ data: rows, pagination: { page, size, totalElements: total.total, totalPages: Math.ceil(total.total / size) } });
});

router.get('/users/:userId', async (request, response) => {
  const id = Number(request.params.userId);
  const row = await new Promise((resolve, reject) => getDatabase().get('SELECT id, first_name AS firstName, last_name AS lastName, email, role, created_at AS createdAt FROM users WHERE id = ?;', [id], (error, value) => error ? reject(error) : resolve(value)));
  if (!row) throw Object.assign(new Error('L’utente richiesto non esiste.'), { status: 404, code: 'USER_NOT_FOUND' });
  response.json({ data: row });
});

router.delete('/users/:userId', async (request, response) => {
  const id = Number(request.params.userId);
  if (!Number.isInteger(id) || id < 1) throw Object.assign(new Error('Identificativo utente non valido.'), { status: 400, code: 'INVALID_USER_ID' });
  await transaction(async db => {
    const user = await db.get('SELECT id, role FROM users WHERE id = ?;', [id]);
    if (!user) throw Object.assign(new Error('L’utente richiesto non esiste.'), { status: 404, code: 'USER_NOT_FOUND' });
    if (user.role === 'admin') throw Object.assign(new Error('Gli amministratori non possono essere eliminati da questa funzione.'), { status: 403, code: 'FORBIDDEN' });
    const participants = await db.all(
      `SELECT DISTINCT bp.user_id AS userId FROM booking_participants bp JOIN bookings b ON b.id=bp.booking_id
       JOIN availabilities a ON a.id=b.availability_id
       WHERE b.id IN (SELECT booking_id FROM booking_participants WHERE user_id=? AND participant_role='organizer')
       AND bp.user_id<>? AND b.status='confirmed' AND b.date || ' ' || a.start_time > ?`,[id,id,romeDateTime()]);
    await queuePhotos(db,await db.all('SELECT photo_path FROM reports WHERE user_id=? AND photo_path IS NOT NULL',[id]));
    const createdAt = new Date().toISOString();
    for (const participant of participants) await db.run(
      `INSERT INTO notifications (user_id, type, title, message, created_at)
       VALUES (?, 'booking_cancelled', 'Prenotazione cancellata', 'Una prenotazione è stata cancellata perché l’account è stato eliminato.', ?);`, [participant.userId, createdAt],
    );
    await db.run('DELETE FROM bookings WHERE id IN (SELECT booking_id FROM booking_participants WHERE user_id = ? AND participant_role = \'organizer\');', [id]);
    await db.run('DELETE FROM users WHERE id = ?;', [id]);
  });
  await cleanupPhotos();
  response.status(204).end();
});

module.exports = router;
