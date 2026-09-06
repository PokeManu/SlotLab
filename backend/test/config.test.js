const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { readConfig } = require('../config');

function testEnvironment(extra = {}) {
  return { SLOTLAB_JWT_SECRET: crypto.randomBytes(32).toString('hex'), ...extra };
}

test('la configurazione rispetta le scadenze e i cookie concordati', () => {
  const config = readConfig(testEnvironment());
  assert.equal(config.port, 3000);
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.auth.accessTokenSeconds, 1800);
  assert.equal(config.auth.refreshTokenSeconds, 604800);
  assert.equal(config.auth.refreshCookieName, 'slotlab_refresh');
  assert.deepEqual(config.auth.refreshCookie, {
    httpOnly: true, secure: true, sameSite: 'lax',
    path: '/api/v1/auth', maxAge: 604800000,
  });
});

test('la configurazione rifiuta segreti mancanti o malformati', () => {
  for (const secret of [undefined, '', 'password', 'x'.repeat(64)]) {
    assert.throws(() => readConfig({ SLOTLAB_JWT_SECRET: secret }), /SLOTLAB_JWT_SECRET/);
  }
});

test('la configurazione valida ambiente e porta', () => {
  for (const port of ['', 'abc', '3.5', '-1', '65536', '0']) {
    assert.throws(() => readConfig(testEnvironment({ PORT: port })), /PORT/);
  }
  assert.equal(readConfig(testEnvironment({ PORT: '0', NODE_ENV: 'test' })).port, 0);
  assert.equal(readConfig(testEnvironment({ PORT: '3100' })).port, 3100);
  assert.throws(() => readConfig(testEnvironment({ NODE_ENV: 'prod' })), /NODE_ENV/);
});

test('una configurazione errata blocca il server prima di creare il database', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'slotlab-config-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const databasePath = path.join(directory, 'must-not-exist.sqlite');
  const result = spawnSync(process.execPath, [path.join(__dirname, '../server.js')], {
    env: { ...process.env, NODE_ENV: 'test', PORT: '0',
      SLOTLAB_JWT_SECRET: '', SLOTLAB_DB_PATH: databasePath },
    encoding: 'utf8', timeout: 10000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /SLOTLAB_JWT_SECRET/);
  assert.equal(fs.existsSync(databasePath), false);
});

test('i comandi dei test non caricano il file .env operativo', () => {
  const backendPackage = require('../package.json');
  assert.equal(backendPackage.scripts.test.includes('--env-file'), false);
});
