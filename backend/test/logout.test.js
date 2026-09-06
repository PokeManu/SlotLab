const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { before, after, test } = require('node:test');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'slotlab-logout-'));
process.env.SLOTLAB_DB_PATH = path.join(directory, 'database.sqlite');
process.env.NODE_ENV = 'test';
process.env.HOST = '127.0.0.1';
process.env.PORT = '0';
process.env.SLOTLAB_JWT_SECRET = crypto.randomBytes(32).toString('hex');
const { startServer, stopServer } = require('../server');
const { getDatabase } = require('../db/db');
const account = {
  firstName: 'Logout', lastName: 'Test', email: 'logout@example.test', password: 'LogoutPassword2026!',
};
let baseUrl;

function post(endpoint, body = {}, headers = {}) {
  return fetch(`${baseUrl}/api/v1/auth/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
}
async function login() {
  const response = await post('login', account);
  assert.equal(response.status, 200);
  return { cookie: response.headers.get('set-cookie').split(';')[0], data: (await response.json()).data };
}
function logout(cookie) {
  return post('logout', {}, { 'X-SlotLab-Request': '1', ...(cookie ? { Cookie: cookie } : {}) });
}
function session() {
  return new Promise((resolve, reject) => {
    getDatabase().get('SELECT * FROM auth_sessions LIMIT 1;', [],
      (error, row) => error ? reject(error) : resolve(row));
  });
}
before(async () => {
  const server = await startServer();
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await post('register', account)).status, 201);
});
after(async () => {
  try { await stopServer(); }
  finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('logout 204 vuoto, sessione rimossa, cookie scaduto e vecchi token inutilizzabili', async () => {
  const previous = await login();
  const response = await logout(previous.cookie);
  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const cookie = response.headers.get('set-cookie');
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/api/v1/auth']) {
    assert.ok(cookie.split('; ').includes(attribute));
  }
  assert.ok(Date.parse(cookie.match(/Expires=([^;]+)/)[1]) < Date.now());
  assert.equal(cookie.includes('Max-Age=604800'), false);
  assert.equal(await session(), undefined);
  const me = await fetch(`${baseUrl}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${previous.data.accessToken}` },
  });
  assert.equal(me.status, 401);
  assert.equal((await post('refresh', {}, {
    Cookie: previous.cookie, 'X-SlotLab-Request': '1',
  })).status, 401);
});

test('logout vecchio o ripetuto non cancella nuova sessione e non invia clear-cookie', async () => {
  const first = await login();
  await logout(first.cookie);
  const second = await login();
  const current = await session();
  for (const cookie of [first.cookie, undefined, 'slotlab_refresh=invalid']) {
    const response = await logout(cookie);
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('set-cookie'), null);
  }
  assert.deepEqual(await session(), current);
  assert.equal((await logout(second.cookie)).status, 204);
});

test('logout del cookie precedente a un refresh non elimina la coppia rinnovata', async () => {
  const previous = await login();
  const renewed = await post('refresh', {}, { Cookie: previous.cookie, 'X-SlotLab-Request': '1' });
  assert.equal(renewed.status, 200);
  const current = await session();
  const response = await logout(previous.cookie);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.deepEqual(await session(), current);
});

test('logout ripetuti simultanei: una sola cancellazione cookie', async () => {
  const previous = await login();
  const results = await Promise.all([logout(previous.cookie), logout(previous.cookie)]);
  assert.deepEqual(results.map(response => response.status), [204, 204]);
  assert.equal(results.filter(response => response.headers.has('set-cookie')).length, 1);
  assert.equal(await session(), undefined);
});

test('richieste senza header o cross-site non eliminano sessioni', async () => {
  const previous = await login();
  const current = await session();
  for (const headers of [{ Cookie: previous.cookie }, {
    Cookie: previous.cookie, 'X-SlotLab-Request': '1', 'Sec-Fetch-Site': 'cross-site',
  }]) {
    const response = await post('logout', {}, headers);
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('set-cookie'), null);
  }
  assert.deepEqual(await session(), current);
});

test('errore DB non dichiara logout riuscito e non cancella il cookie', async (t) => {
  const previous = await login();
  const current = await session();
  t.mock.method(console, 'error', () => {});
  t.mock.method(getDatabase(), 'run', (sql, values, callback) => callback(new Error('errore riservato')));
  const response = await logout(previous.cookie);
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error.code, 'INTERNAL_ERROR');
  assert.equal(response.headers.get('set-cookie'), null);
  assert.deepEqual(await session(), current);
});
