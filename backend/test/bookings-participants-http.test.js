const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { before, after, test } = require('node:test');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'slotlab-bookings-participants-'));
process.env.SLOTLAB_DB_PATH = path.join(directory, 'test.sqlite');
process.env.NODE_ENV = 'test';
process.env.HOST = '127.0.0.1';
process.env.PORT = '0';
process.env.SLOTLAB_JWT_SECRET = crypto.randomBytes(32).toString('hex');

const { startServer, stopServer } = require('../server');
const { getDatabase } = require('../db/db');
const { queries } = require('../db/transaction');
const { hashPassword } = require('../security/password');

let base;
let db;
const password = 'ParticipantsFixture2026!';
const accounts = {};

async function request(url, method = 'GET', body, token) {
  const response = await fetch(`${base}/api/v1${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(method === 'POST' && url === '/bookings' ? { 'Idempotency-Key': `participants-${Date.now()}-${Math.random()}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: response.status === 204 ? null : await response.json() };
}

function futureDate() {
  const date = new Date(Date.now() + 8 * 86400000);
  return date.toISOString().slice(0, 10);
}

before(async () => {
  const server = await startServer();
  base = `http://127.0.0.1:${server.address().port}`;
  db = queries(getDatabase());
  const building = await db.run(
    `INSERT INTO buildings(number,name,address,latitude,longitude) VALUES(?,?,?,?,?)`,
    [991, 'Edificio partecipanti', 'Ambiente di test', 38, 13],
  );
  const space = await db.run(
    `INSERT INTO spaces(building_id,name,floor,type,capacity,accessible,status) VALUES(?,?,0,'study_room',8,1,'active')`,
    [building.lastId, 'Aula partecipanti'],
  );
  const date = futureDate();
  const availability = await db.run(
    `INSERT INTO availabilities(space_id,valid_from,valid_until,weekday,start_time,end_time,is_retired) VALUES(?,?,?,?,?,?,0)`,
    [space.lastId, date, date, new Date(`${date}T12:00:00Z`).getUTCDay() || 7, '10:00', '12:00'],
  );
  const laterAvailability = await db.run(
    `INSERT INTO availabilities(space_id,valid_from,valid_until,weekday,start_time,end_time,is_retired) VALUES(?,?,?,?,?,?,0)`,
    [space.lastId, date, date, new Date(`${date}T12:00:00Z`).getUTCDay() || 7, '14:00', '16:00'],
  );
  const passwordHash = await hashPassword(password);
  for (const [key, email] of Object.entries({ organizer: 'organizer-participants@test.example', invitee: 'invitee-participants@test.example', second: 'second-participants@test.example' })) {
    await db.run(
      `INSERT INTO users(first_name,last_name,email,password_hash,role,created_at) VALUES(?,?,?,?, 'user',?)`,
      [key, 'Participants', email, passwordHash, new Date().toISOString()],
    );
    const login = await request('/auth/login', 'POST', { email, password });
    assert.equal(login.status, 200);
    accounts[key] = login.body.data;
  }
  accounts.spaceId = space.lastId;
  accounts.availabilityId = availability.lastId;
  accounts.laterAvailabilityId = laterAvailability.lastId;
  accounts.date = date;
});

after(async () => {
  await stopServer();
  fs.rmSync(directory, { recursive: true, force: true });
});

test('la Home restituisce la stessa prenotazione a creatore e partecipanti, senza duplicati', async () => {
  const booking = await request('/bookings', 'POST', {
    spaceId: accounts.spaceId,
    availabilityId: accounts.availabilityId,
    date: accounts.date,
    participantEmails: ['invitee-participants@test.example', 'second-participants@test.example'],
  }, accounts.organizer.accessToken);
  assert.equal(booking.status, 201);
  const bookingId = booking.body.data.id;

  for (const account of [accounts.organizer, accounts.invitee, accounts.second]) {
    const home = await request('/bookings', 'GET', undefined, account.accessToken);
    assert.equal(home.status, 200);
    assert.equal(home.body.data.length, 1);
    assert.equal(home.body.data[0].id, bookingId);
    assert.equal(home.body.data[0].participantCount, 3);
    assert.equal(home.body.data[0].spaceName, 'Aula partecipanti');
  }

  const duplicateEmails = await request('/bookings', 'POST', {
    spaceId: accounts.spaceId,
    availabilityId: accounts.availabilityId,
    date: accounts.date,
    participantEmails: ['invitee-participants@test.example', 'invitee-participants@test.example'],
  }, accounts.organizer.accessToken);
  assert.equal(duplicateEmails.status, 409);
  assert.equal(duplicateEmails.body.error.code, 'DUPLICATE_PARTICIPANT');

  const duplicateParticipant = await request(`/bookings/${bookingId}/participants`, 'POST', { email: 'invitee-participants@test.example' }, accounts.organizer.accessToken);
  assert.equal(duplicateParticipant.status, 409);
  assert.equal(duplicateParticipant.body.error.code, 'DUPLICATE_PARTICIPANT');

  const laterBooking = await request('/bookings', 'POST', {
    spaceId: accounts.spaceId,
    availabilityId: accounts.laterAvailabilityId,
    date: accounts.date,
    participantEmails: [],
  }, accounts.organizer.accessToken);
  assert.equal(laterBooking.status, 201);

  const ordered = await request('/bookings', 'GET', undefined, accounts.organizer.accessToken);
  assert.equal(ordered.status, 200);
  assert.deepEqual(ordered.body.data.map(item => item.id), [bookingId, laterBooking.body.data.id]);
  assert.deepEqual(ordered.body.data.map(item => item.startTime), ['10:00', '14:00']);
});
