const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { before, after, test } = require('node:test');
const jwt = require('jsonwebtoken');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'slotlab-login-'));
process.env.SLOTLAB_DB_PATH = path.join(directory, 'database.sqlite');
process.env.NODE_ENV = 'test';
process.env.HOST = '127.0.0.1';
process.env.PORT = '0';
process.env.SLOTLAB_JWT_SECRET = crypto.randomBytes(32).toString('hex');

const { startServer, stopServer } = require('../server');
const { getDatabase } = require('../db/db');
const { seed } = require('../db/seed');
const { readConfig } = require('../config');
const { auth } = readConfig();
const key = Buffer.from(auth.jwtSecret, 'hex');
const account = {
  firstName: 'Login', lastName: 'Test', email: 'login@example.test', password: 'LoginPassword2026!',
};
let baseUrl;

async function post(endpoint, input) {
  const response = await fetch(`${baseUrl}/api/v1/auth/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  return { response, body: await response.json() };
}

function get(sql, values = []) {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, values, (error, row) => error ? reject(error) : resolve(row));
  });
}

function sessionFor(userId) {
  return get('SELECT * FROM auth_sessions WHERE user_id = ?;', [userId]);
}

function refreshFrom(result) {
  const header = result.response.headers.get('set-cookie');
  assert.ok(header);
  const [name, value] = header.split(';')[0].split('=');
  assert.equal(name, 'slotlab_refresh');
  return value;
}

function refreshHash(result) {
  return crypto.createHash('sha256').update(refreshFrom(result)).digest('hex');
}

function claimsFor(result) {
  return jwt.verify(result.body.data.accessToken, key, { algorithms: ['HS256'] });
}

before(async () => {
  const server = await startServer();
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await post('register', account)).response.status, 201);
  await seed({ admin: { ...account, email: 'admin-login@example.test' },
    databasePath: process.env.SLOTLAB_DB_PATH });
});

after(async () => {
  try {
    await stopServer();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('login pubblico: JWT firmato con soli claim previsti e durata di 30 minuti', async () => {
  const result = await post('login', { email: ' LOGIN@Example.test ', password: account.password });
  assert.equal(result.response.status, 200);
  assert.equal(result.response.headers.get('cache-control'), 'no-store');
  const data = result.body.data;
  assert.deepEqual(Object.keys(data).sort(), ['accessToken', 'tokenType', 'expiresIn', 'user'].sort());
  assert.equal(data.tokenType, 'Bearer');
  assert.equal(data.expiresIn, 1800);
  assert.deepEqual(data.user, {
    id: data.user.id, firstName: 'Login', lastName: 'Test', email: account.email, role: 'user',
  });
  const claims = claimsFor(result);
  assert.deepEqual(Object.keys(claims).sort(), ['sub', 'role', 'iat', 'exp', 'jti'].sort());
  assert.equal(claims.sub, String(data.user.id));
  assert.equal(claims.role, 'user');
  assert.equal(claims.exp - claims.iat, 1800);
  assert.ok(Math.abs(claims.iat - Date.now() / 1000) < 5);
  assert.equal(typeof claims.jti, 'string');
  assert.ok(claims.jti.length > 0);
  assert.throws(() => jwt.verify(data.accessToken, key, {
    algorithms: ['HS256'], clockTimestamp: claims.exp,
  }), { name: 'TokenExpiredError' });
  assert.throws(() => jwt.verify(data.accessToken, crypto.randomBytes(32), {
    algorithms: ['HS256'],
  }));
});

test('refresh: cookie protetto di 7 giorni e nel database soltanto hash e jti', async () => {
  const result = await post('login', account);
  assert.equal(result.response.status, 200);
  const header = result.response.headers.get('set-cookie');
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/api/v1/auth', 'Max-Age=604800']) {
    assert.ok(header.split('; ').includes(attribute));
  }
  assert.equal(header.includes('Domain='), false);
  const refresh = refreshFrom(result);
  assert.match(refresh, /^[A-Za-z0-9_-]{43}$/);
  const session = await sessionFor(result.body.data.user.id);
  assert.equal(session.refresh_token_hash, refreshHash(result));
  assert.equal(session.access_token_jti, claimsFor(result).jti);
  assert.equal(Date.parse(session.refresh_expires_at) - Date.parse(session.created_at), 604800000);
  assert.equal(JSON.stringify(session).includes(refresh), false);
  assert.equal(JSON.stringify(result.body).includes(refresh), false);
  assert.equal(JSON.stringify(session).includes(result.body.data.accessToken), false);
});

test('email assente, password errata e input non valido: stesso 401 senza cambiare sessione', async () => {
  const user = await get('SELECT id FROM users WHERE email = ?;', [account.email]);
  const previous = await sessionFor(user.id);
  const beforeCount = await get('SELECT COUNT(*) AS count FROM auth_sessions;');
  for (const input of [{ email: 'missing@example.test', password: account.password },
    { ...account, password: 'WrongPassword2026!' }, { ...account, password: ' ' + account.password },
    { ...account, password: account.password + '\n' }, { ...account, password: 'a'.repeat(65) },
    { ...account, email: 'invalid' }, { ...account, password: null }, {}, []]) {
    const result = await post('login', input);
    assert.equal(result.response.status, 401);
    assert.deepEqual(result.body, { error: {
      code: 'INVALID_CREDENTIALS', message: 'Email o password non corrette.',
    } });
    assert.equal(result.response.headers.get('set-cookie'), null);
  }
  assert.deepEqual(await sessionFor(user.id), previous);
  assert.deepEqual(await get('SELECT COUNT(*) AS count FROM auth_sessions;'), beforeCount);
});

test('JSON null o malformato resta un errore 400 del parser, senza cookie', async () => {
  for (const body of ['null', '{']) {
    const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'INVALID_JSON');
    assert.equal(response.headers.get('set-cookie'), null);
  }
});

test('login amministratore: ruolo letto dal database, non dal client', async () => {
  const admin = await post('login', { ...account, email: 'admin-login@example.test', role: 'user' });
  assert.equal(admin.response.status, 200);
  assert.equal(admin.body.data.user.role, 'admin');
  assert.equal(claimsFor(admin).role, 'admin');
  const user = await post('login', { ...account, role: 'admin' });
  assert.equal(user.body.data.user.role, 'user');
  assert.equal(claimsFor(user).role, 'user');
});

test('nuovo login sostituisce hash refresh e jti, mantenendo una sola sessione', async () => {
  const first = await post('login', account);
  const second = await post('login', account);
  const session = await sessionFor(second.body.data.user.id);
  assert.notEqual(claimsFor(first).jti, claimsFor(second).jti);
  assert.notEqual(refreshFrom(first), refreshFrom(second));
  assert.notEqual(session.access_token_jti, claimsFor(first).jti);
  assert.notEqual(session.refresh_token_hash, refreshHash(first));
  assert.equal(session.access_token_jti, claimsFor(second).jti);
  assert.equal(session.refresh_token_hash, refreshHash(second));
  assert.equal((await get('SELECT COUNT(*) AS count FROM auth_sessions WHERE user_id = ?;',
    [second.body.data.user.id])).count, 1);
});

test('login concorrenti: una sola coppia hash refresh e jti corrente', async () => {
  const results = await Promise.all([post('login', account), post('login', account)]);
  assert.deepEqual(results.map(result => result.response.status), [200, 200]);
  const session = await sessionFor(results[0].body.data.user.id);
  const current = results.filter(result => claimsFor(result).jti === session.access_token_jti);
  assert.equal(current.length, 1);
  assert.equal(session.refresh_token_hash, refreshHash(current[0]));
  assert.equal((await get('SELECT COUNT(*) AS count FROM auth_sessions WHERE user_id = ?;',
    [results[0].body.data.user.id])).count, 1);
});

test('fallimento salvataggio sessione: niente token/cookie e sessione precedente conservata', async (t) => {
  const user = await get('SELECT id FROM users WHERE email = ?;', [account.email]);
  const previous = await sessionFor(user.id);
  const log = t.mock.method(console, 'error', () => {});
  t.mock.method(getDatabase(), 'run', (sql, values, callback) => {
    callback(Object.assign(new Error('dettaglio SQL riservato'), { code: 'SQLITE_ERROR' }));
  });
  const result = await post('login', account);
  assert.equal(result.response.status, 500);
  assert.equal(result.response.headers.get('set-cookie'), null);
  assert.deepEqual(result.body, { error: {
    code: 'INTERNAL_ERROR', message: 'Si e verificato un errore inatteso.',
  } });
  assert.deepEqual(log.mock.calls[0].arguments, ['Errore interno durante la gestione di una richiesta.']);
  assert.deepEqual(await sessionFor(user.id), previous);
});

test('password cambiata dopo la lettura account impedisce il salvataggio della sessione', async (t) => {
  const input = { ...account, email: 'changed@example.test' };
  const registration = await post('register', input);
  assert.equal(registration.response.status, 201);
  const database = getDatabase();
  const originalGet = database.get.bind(database);
  t.mock.method(database, 'get', (sql, values, callback) => {
    return originalGet(sql, values, (error, row) => {
      if (error || !sql.includes('password_hash')) return callback(error, row);
      database.run('UPDATE users SET password_hash = ? WHERE id = ?;',
        ['test-only-changed-hash', row.id], changeError => callback(changeError, row));
    });
  });
  const result = await post('login', input);
  assert.equal(result.response.status, 401);
  assert.equal(result.body.error.code, 'INVALID_CREDENTIALS');
  assert.equal(result.response.headers.get('set-cookie'), null);
  assert.equal(await sessionFor(registration.body.data.id), undefined);
});
