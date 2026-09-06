const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { before, after, test } = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'slotlab-auth-'));
process.env.SLOTLAB_DB_PATH = path.join(directory, 'database.sqlite');
process.env.NODE_ENV = 'test';
process.env.HOST = '127.0.0.1';
process.env.PORT = '0';
process.env.SLOTLAB_JWT_SECRET = crypto.randomBytes(32).toString('hex');

const { startServer, stopServer } = require('../server');
const { getDatabase } = require('../db/db');
const { seed } = require('../db/seed');
const { requireAuth, requireRole } = require('../middleware/auth');
const errorHandler = require('../middleware/error-handler');
const key = Buffer.from(process.env.SLOTLAB_JWT_SECRET, 'hex');
const account = {
  firstName: 'Auth', lastName: 'Test', email: 'auth@example.test', password: 'AuthPassword2026!',
};
let baseUrl;
let roleServer;
let roleUrl;

async function post(endpoint, input) {
  const response = await fetch(`${baseUrl}/api/v1/auth/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  assert.ok(response.ok);
  return (await response.json()).data;
}

function run(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, parameters, error => error ? reject(error) : resolve());
  });
}

async function me(token, suffix = '', extraHeaders = {}) {
  const response = await fetch(`${baseUrl}/api/v1/users/me${suffix}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extraHeaders },
  });
  return { response, body: await response.json() };
}

function sign(claims, options = {}) {
  return jwt.sign(claims, key, {
    algorithm: 'HS256', noTimestamp: !Object.hasOwn(claims, 'iat'), ...options,
  });
}

before(async () => {
  const server = await startServer();
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  await post('register', account);
  await seed({ admin: { ...account, email: 'auth-admin@example.test' },
    databasePath: process.env.SLOTLAB_DB_PATH });
  // Rotte di prova soltanto in memoria: nessun endpoint admin fittizio nel prodotto.
  const roleApp = express();
  roleApp.get('/admin', requireAuth, requireRole('admin'), (req, res) => res.sendStatus(204));
  roleApp.get('/user', requireAuth, requireRole('user'), (req, res) => res.sendStatus(204));
  roleApp.use(errorHandler);
  roleServer = await new Promise((resolve, reject) => {
    const server = roleApp.listen(0, '127.0.0.1', () => resolve(server));
    server.once('error', reject);
  });
  roleUrl = `http://127.0.0.1:${roleServer.address().port}`;
});

after(async () => {
  try {
    if (roleServer) await new Promise((resolve, reject) => {
      roleServer.close(error => error ? reject(error) : resolve());
    });
    await stopServer();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('users/me restituisce solo i dati pubblici correnti di user e admin', async () => {
  for (const [email, role] of [[account.email, 'user'], ['auth-admin@example.test', 'admin']]) {
    const login = await post('login', { ...account, email });
    const { response, body } = await me(login.accessToken, '?id=999&role=admin');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(body, { data: { ...login.user, createdAt: body.data.createdAt } });
    assert.equal(body.data.role, role);
    assert.equal(new Date(body.data.createdAt).toISOString(), body.data.createdAt);
    assert.equal(response.headers.get('set-cookie'), null);
  }
});

test('Bearer assente o malformato e token in query/cookie non autorizzano', async () => {
  const login = await post('login', account);
  for (const header of [undefined, 'Basic abc', 'Bearer', 'Bearer abc def', 'Bearer malformed']) {
    const { response, body } = await me(undefined, '', header ? { Authorization: header } : {});
    assert.equal(response.status, 401);
    assert.equal(body.error.code, 'UNAUTHORIZED');
  }
  const result = await me(undefined, `?accessToken=${login.accessToken}`, {
    Cookie: `slotlab_refresh=${login.accessToken}`,
  });
  assert.equal(result.response.status, 401);
  assert.equal((await me(undefined, '', { Authorization: `bearer ${login.accessToken}` })).response.status, 200);
});

test('token scaduto, firma errata, algoritmo diverso e token senza firma: 401', async () => {
  const login = await post('login', account);
  const claims = jwt.verify(login.accessToken, key);
  const now = Math.floor(Date.now() / 1000);
  const tokens = [
    sign({ ...claims, iat: now - 1800, exp: now }),
    jwt.sign(claims, crypto.randomBytes(32), { algorithm: 'HS256' }),
    sign(claims, { algorithm: 'HS384' }),
    jwt.sign(claims, null, { algorithm: 'none' }),
  ];
  for (const token of tokens) {
    const { response, body } = await me(token);
    assert.equal(response.status, 401);
    assert.equal(body.error.code, 'UNAUTHORIZED');
  }
});

test('claim mancanti, extra o incoerenti sono rifiutati anche con firma valida', async () => {
  const login = await post('login', account);
  const claims = jwt.verify(login.accessToken, key);
  const variants = [
    { ...claims, sub: 1 }, { ...claims, sub: '01' }, { ...claims, sub: '0' },
    { ...claims, sub: '9007199254740992' }, { ...claims, role: 'teacher' },
    { ...claims, role: 'admin' }, { ...claims, jti: '' }, { ...claims, jti: 'other-session' },
    { ...claims, exp: claims.exp + 1 }, { ...claims, extra: true },
    { ...claims, iat: claims.iat + 3600, exp: claims.exp + 3600 },
  ];
  for (const field of ['sub', 'role', 'iat', 'exp', 'jti']) {
    const missing = { ...claims };
    delete missing[field];
    variants.push(missing);
  }
  for (const variant of variants) {
    assert.equal((await me(sign(variant))).response.status, 401);
  }
});

test('nuovo login: vecchio JWT ancora firmato ma subito rifiutato da users/me', async () => {
  const first = await post('login', account);
  assert.equal((await me(first.accessToken)).response.status, 200);
  const second = await post('login', account);
  assert.ok(jwt.verify(first.accessToken, key));
  assert.equal((await me(first.accessToken)).response.status, 401);
  assert.equal((await me(second.accessToken)).response.status, 200);
});

test('sessione eliminata: JWT non scaduto rifiutato', async () => {
  const login = await post('login', account);
  await run('DELETE FROM auth_sessions WHERE user_id = ?;', [login.user.id]);
  assert.equal((await me(login.accessToken)).response.status, 401);
});

test('account eliminato: JWT non scaduto rifiutato', async () => {
  const input = { ...account, email: 'delete-auth@example.test' };
  await post('register', input);
  const login = await post('login', input);
  await run('DELETE FROM users WHERE id = ?;', [login.user.id]);
  assert.equal((await me(login.accessToken)).response.status, 401);
});

test('controlli ruolo HTTP: user e admin separati, 403 distinto da 401', async () => {
  const user = await post('login', account);
  const admin = await post('login', { ...account, email: 'auth-admin@example.test' });
  for (const [login, allowed, denied] of [[user, '/user', '/admin'], [admin, '/admin', '/user']]) {
    const headers = { Authorization: `Bearer ${login.accessToken}` };
    assert.equal((await fetch(roleUrl + allowed, { headers })).status, 204);
    const response = await fetch(roleUrl + denied, { headers });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, 'FORBIDDEN');
  }
  assert.equal((await fetch(roleUrl + '/admin')).status, 401);
});

test('errore DB nelle API protette resta un 500 generico', async (t) => {
  const login = await post('login', account);
  const log = t.mock.method(console, 'error', () => {});
  t.mock.method(getDatabase(), 'get', (sql, values, callback) => {
    callback(Object.assign(new Error('dettaglio riservato'), { code: 'SQLITE_ERROR' }));
  });
  const { response, body } = await me(login.accessToken);
  assert.equal(response.status, 500);
  assert.deepEqual(body, { error: {
    code: 'INTERNAL_ERROR', message: 'Si e verificato un errore inatteso.',
  } });
  assert.deepEqual(log.mock.calls[0].arguments, ['Errore interno durante la gestione di una richiesta.']);
});
