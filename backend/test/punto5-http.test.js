const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { before, after, test } = require('node:test');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'slotlab-punto5-'));
process.env.SLOTLAB_DB_PATH = path.join(directory, 'test.sqlite');
process.env.NODE_ENV = 'test';
process.env.HOST = '127.0.0.1';
process.env.PORT = '0';
process.env.SLOTLAB_JWT_SECRET = crypto.randomBytes(32).toString('hex');
const { startServer, stopServer } = require('../server');
const { getDatabase } = require('../db/db');
const { queries, transaction } = require('../db/transaction');
const { hashPassword } = require('../security/password');
let db, base, adminToken, userToken, userId, buildingId;
const password = 'FixturePassword2026!';

async function request(url, method = 'GET', body, token = adminToken) {
  const response = await fetch(`${base}/api/v1${url}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: response.status === 204 ? null : await response.json() };
}
function day(offset) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
async function space(name = 'Fixture statistiche') {
  return (await db.run(`INSERT INTO spaces(building_id,name,floor,type,capacity,accessible,status)
    VALUES(?,?,0,'study_room',20,1,'active')`, [buildingId, name])).lastId;
}
async function availability(spaceId, date, start = '10:00', end = '12:00', retired = 0) {
  return (await db.run(`INSERT INTO availabilities(space_id,valid_from,valid_until,weekday,start_time,end_time,is_retired)
    VALUES(?,?,?,?,?,?,?)`, [spaceId,date,date,new Date(`${date}T12:00:00Z`).getUTCDay() || 7,start,end,retired])).lastId;
}
async function booking(spaceId, availabilityId, date) {
  const id = (await db.run(`INSERT INTO bookings(space_id,availability_id,date,status,created_at)
    VALUES(?,?,?,'confirmed',?)`, [spaceId,availabilityId,date,new Date().toISOString()])).lastId;
  await db.run(`INSERT INTO booking_participants(booking_id,user_id,participant_role,present)
    VALUES(?,?,'organizer',0)`, [id,userId]);
  return id;
}

before(async () => {
  const server = await startServer();
  base = `http://127.0.0.1:${server.address().port}`;
  db = queries(getDatabase());
  const hash = await hashPassword(password);
  for (const role of ['admin', 'user']) {
    const row = await db.run(`INSERT INTO users(first_name,last_name,email,password_hash,role,created_at)
      VALUES('Fixture','Punto5',?,?,?,?)`, [`${role}@punto5.test`,hash,role,new Date().toISOString()]);
    if (role === 'user') userId = row.lastId;
    const result = await request('/auth/login', 'POST', { email: `${role}@punto5.test`, password }, null);
    assert.equal(result.status, 200);
    if (role === 'admin') adminToken = result.body.data.accessToken;
    else userToken = result.body.data.accessToken;
  }
  buildingId = (await db.run(`INSERT INTO buildings(number,name,address,latitude,longitude)
    VALUES(999,'Edificio di test','Ambiente isolato',38,13)`)).lastId;
});
after(async () => {
  await stopServer();
  fs.rmSync(directory, { recursive: true, force: true });
});

test('statistiche HTTP: ruoli, date rigorose, snapshot senza prenotazioni e capienza storica', async () => {
  const yesterday = day(-1);
  const spaceId = await space();
  await availability(spaceId, yesterday);
  // Fixture dichiarata: il monitor era attivo prima dell'inizio delle fasce.
  await transaction(async query => {
    await query.run('UPDATE occurrence_tracking SET tracking_started_at=?,consolidated_until=? WHERE id=1',
      [`${day(-2)}T00:00:00.000Z`,`${day(-2)}T00:00:00.000Z`]);
  });
  const url = `/admin/statistics?dateFrom=${yesterday}&dateTo=${yesterday}`;
  assert.equal((await request(url, 'GET', undefined, null)).status, 401);
  assert.equal((await request(url, 'GET', undefined, userToken)).status, 403);
  for (const query of ['', '?from=2026-01-01&until=2026-01-02', '?dateFrom=2026-02-30&dateTo=2026-03-01', '?dateFrom=2026-03-02&dateTo=2026-03-01']) {
    assert.equal((await request(`/admin/statistics${query}`)).status, 400);
  }
  const first = await request(url);
  assert.equal(first.status, 200);
  assert.equal(first.body.data.offeredCapacity, 20);
  assert.equal(first.body.data.bookings, 0);
  assert.equal(first.body.data.utilizationRate, 0);
  assert.equal(first.body.data.checkInRate, null);
  assert.equal((await request(`/admin/spaces/${spaceId}`, 'PATCH', { capacity: 40 })).status, 200);
  assert.equal((await request(url)).body.data.offeredCapacity, 20);
  const historic = await request(`/admin/statistics?dateFrom=2020-01-01&dateTo=2020-01-02`);
  assert.equal(historic.body.data.history.complete, false);
  assert.equal(historic.body.data.utilizationRate, null);
});

test('nuova fascia: cancella future incompatibili ritirate con notifica e conserva idempotenza', async () => {
  const date = day(2);
  const spaceId = await space('Ritiro fixture');
  const old = await availability(spaceId, date, '10:00', '12:00', 1);
  const bookingId = await booking(spaceId, old, date);
  await db.run('INSERT INTO booking_requests(user_id,idempotency_key,request_hash,booking_id,created_at) VALUES(?,?,?,?,?)',
    [userId,'fixture-retirement','a'.repeat(64),bookingId,new Date().toISOString()]);
  const result = await request(`/admin/spaces/${spaceId}/availability`, 'POST', {
    validFrom: date, validUntil: date, weekday: new Date(`${date}T12:00:00Z`).getUTCDay() || 7, startTime: '10:00', endTime: '14:00',
  });
  assert.equal(result.status, 201);
  assert.equal(await db.get('SELECT id FROM bookings WHERE id=?', [bookingId]), undefined);
  assert.equal((await db.get('SELECT booking_id FROM booking_requests WHERE idempotency_key=?', ['fixture-retirement'])).booking_id, null);
  assert.equal((await db.get("SELECT COUNT(*) AS n FROM notifications WHERE user_id=? AND message LIKE '%configurazione%'", [userId])).n, 1);
  const catalog = await request('/spaces?availableNow=true&minSeats=1', 'GET', undefined, userToken);
  assert.equal(catalog.status, 200);
  assert.ok(catalog.body.data.some(item => item.id === spaceId));
});

test('riutilizzo fascia: sostituisce la ritirata senza duplicarla e conserva le prenotazioni compatibili', async () => {
  const date = day(4);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
  const spaceId = await space('Riutilizzo fixture');
  const old = await availability(spaceId, date, '10:00', '12:00', 1);
  const bookingId = await booking(spaceId, old, date);
  const result = await request(`/admin/spaces/${spaceId}/availability/${old}/reuse`, 'POST', {
    validFrom: date, validUntil: date, weekday, startTime: '10:00', endTime: '12:00',
  });
  assert.equal(result.status, 201);
  const replacement = result.body.data.availabilityId;
  assert.equal((await db.get('SELECT availability_id AS id FROM bookings WHERE id=?', [bookingId])).id, replacement);
  assert.equal((await db.get('SELECT superseded_by_id AS id FROM availabilities WHERE id=?', [old])).id, replacement);
  const visible = await request(`/admin/spaces/${spaceId}/availability`);
  assert.deepEqual(visible.body.data.map(item => item.availabilityId), [replacement]);
});

test('modifica fascia: rollback conserva prenotazioni se la notifica fallisce', async () => {
  const date = day(3);
  const spaceId = await space('Rollback fixture');
  const old = await availability(spaceId, date);
  const bookingId = await booking(spaceId, old, date);
  await db.run("CREATE TRIGGER fail_notice BEFORE INSERT ON notifications BEGIN SELECT RAISE(ABORT,'fixture'); END");
  try {
    const result = await request(`/admin/spaces/${spaceId}/availability/${old}`, 'PATCH', {
      validFrom: date, validUntil: date, weekday: new Date(`${date}T12:00:00Z`).getUTCDay() || 7, startTime: '12:00', endTime: '14:00',
    });
    assert.equal(result.status, 500);
    assert.ok(await db.get('SELECT id FROM bookings WHERE id=?', [bookingId]));
    assert.equal((await db.get('SELECT is_retired FROM availabilities WHERE id=?', [old])).is_retired, 0);
  } finally { await db.run('DROP TRIGGER fail_notice'); }
});

test('il limite cinque conta solo prenotazioni con inizio futuro', async () => {
  const limitEmail = 'limit-five@punto5.test';
  const limitUser = await db.run(`INSERT INTO users(first_name,last_name,email,password_hash,role,created_at)
    VALUES('Limit','Five',?,?, 'user', ?)`, [limitEmail, await hashPassword(password), new Date().toISOString()]);
  const login = await request('/auth/login', 'POST', { email: limitEmail, password }, null);
  assert.equal(login.status, 200);
  const limitToken = login.body.data.accessToken;

  const endedSpaceId = await space('Limite terminata oggi');
  const today = day(0);
  const endedAvailabilityId = await availability(endedSpaceId, today, '00:00', '00:01');
  const endedBooking = await db.run(`INSERT INTO bookings(space_id,availability_id,date,status,created_at)
    VALUES(?,?,?,'confirmed',?)`, [endedSpaceId, endedAvailabilityId, today, new Date().toISOString()]);
  await db.run(`INSERT INTO booking_participants(booking_id,user_id,participant_role,present)
    VALUES(?,?, 'organizer',0)`, [endedBooking.lastId, limitUser.lastId]);

  for (let offset = 2; offset <= 5; offset += 1) {
    const futureDate = day(offset);
    const futureSpaceId = await space(`Limite futura ${offset}`);
    const futureAvailabilityId = await availability(futureSpaceId, futureDate);
    const futureBooking = await db.run(`INSERT INTO bookings(space_id,availability_id,date,status,created_at)
      VALUES(?,?,?,'confirmed',?)`, [futureSpaceId, futureAvailabilityId, futureDate, new Date().toISOString()]);
    await db.run(`INSERT INTO booking_participants(booking_id,user_id,participant_role,present)
      VALUES(?,?, 'organizer',0)`, [futureBooking.lastId, limitUser.lastId]);
  }

  const targetDate = day(6);
  const targetSpaceId = await space('Limite nuova');
  const targetAvailabilityId = await availability(targetSpaceId, targetDate);
  const response = await fetch(`${base}/api/v1/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${limitToken}`,
      'Idempotency-Key': 'limit-five-new-booking',
    },
    body: JSON.stringify({ spaceId: targetSpaceId, availabilityId: targetAvailabilityId, date: targetDate, participantEmails: [] }),
  });
  assert.equal(response.status, 201);
});

test('indisponibilità retrodatata e modifica conservano prenotazione terminata e snapshot', async () => {
  const date = day(-1);
  const spaceId = await space('Storico indisponibilità');
  const old = await availability(spaceId, date);
  const bookingId = await booking(spaceId, old, date);
  await db.run(`INSERT INTO slot_occurrences(space_id,date,start_time,end_time,offered_capacity,was_offered,finalized_at)
    VALUES(?,?,'10:00','12:00',20,1,?)`, [spaceId,date,new Date().toISOString()]);
  const url = `/admin/spaces/${spaceId}/unavailability`;
  const result = await request(url, 'POST', { date,startTime:'10:00',endTime:'12:00',reason:'Fixture' });
  assert.equal(result.status, 201);
  const id = result.body.data.id;
  assert.equal((await request(`${url}/${id}`, 'PATCH', { date,startTime:'09:00',endTime:'13:00',reason:'Modifica fixture' })).status, 200);
  assert.ok(await db.get('SELECT id FROM bookings WHERE id=?', [bookingId]));
  assert.equal((await db.get('SELECT offered_capacity FROM slot_occurrences WHERE space_id=?', [spaceId])).offered_capacity, 20);
  assert.equal((await request(`${url}/${id}`, 'DELETE')).status, 204);
  assert.equal((await db.get('SELECT offered_capacity FROM slot_occurrences WHERE space_id=?', [spaceId])).offered_capacity, 20);
});
