const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, test } = require('node:test');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'slotlab-backend-'));
const databasePath = path.join(testDirectory, 'database.sqlite');

process.env.SLOTLAB_DB_PATH = databasePath;
process.env.PORT = '0';

const { connectDatabase, getDatabase } = require('../db/db');
const { migrate } = require('../db/migrate');
const { seed } = require('../db/seed');
const { startServer, stopServer } = require('../server');

const testAdmin = {
  firstName: 'Test',
  lastName: 'Admin',
  email: 'ADMIN@example.test',
  password: 'TestAdmin2026!',
};

function run(database, sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, parameters, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({ lastId: this.lastID, changes: this.changes });
    });
  });
}

function get(database, sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.get(sql, parameters, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

function all(database, sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, parameters, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

after(async () => {
  try {
    await stopServer();
  } finally {
    fs.rmSync(testDirectory, { recursive: true, force: true });
  }
});

test('le migrazioni sono ripetibili', async () => {
  const firstRun = await migrate({ databasePath });
  const secondRun = await migrate({ databasePath });

  assert.deepEqual(firstRun.appliedNow, [1]);
  assert.deepEqual(secondRun.appliedNow, []);
});

test('la connessione condivisa usa lo schema completo', async () => {
  const firstConnection = await connectDatabase({ databasePath });
  const secondConnection = await connectDatabase({ databasePath });
  const foreignKeys = await get(firstConnection, 'PRAGMA foreign_keys;');
  const applicationTables = await all(
    firstConnection,
    `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
        AND name <> 'schema_migrations';
    `,
  );
  const foreignKeyErrors = await all(
    firstConnection,
    'PRAGMA foreign_key_check;',
  );

  assert.equal(firstConnection, secondConnection);
  assert.equal(foreignKeys.foreign_keys, 1);
  assert.equal(applicationTables.length, 16);
  assert.deepEqual(foreignKeyErrors, []);
});

test('i dati iniziali non producono duplicati', async () => {
  const firstRun = await seed({ databasePath, admin: testAdmin });
  const secondRun = await seed({ databasePath, admin: testAdmin });
  const database = getDatabase();
  const serviceCount = await get(
    database,
    'SELECT COUNT(*) AS count FROM services;',
  );
  const admin = await get(
    database,
    `
      SELECT email, password_hash, role
      FROM users
      WHERE role = 'admin';
    `,
  );
  const adminCount = await get(
    database,
    "SELECT COUNT(*) AS count FROM users WHERE role = 'admin';",
  );

  assert.equal(firstRun.adminCreated, true);
  assert.equal(secondRun.adminCreated, false);
  assert.equal(serviceCount.count, 5);
  assert.equal(adminCount.count, 1);
  assert.equal(admin.email, 'admin@example.test');
  assert.equal(admin.role, 'admin');
  assert.match(
    admin.password_hash,
    /^scrypt\$16384\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/,
  );
  assert.equal(admin.password_hash.includes(testAdmin.password), false);
});

test('il seed rifiuta password non valide', async () => {
  await assert.rejects(
    seed({
      databasePath,
      admin: { ...testAdmin, email: 'weak@example.test', password: 'debole' },
    }),
    /La password deve avere 8-64 caratteri/,
  );
});

test('il seed non promuove un utente normale', async () => {
  const database = getDatabase();
  await run(
    database,
    `
      INSERT INTO users (
        first_name,
        last_name,
        email,
        password_hash,
        role,
        created_at
      )
      VALUES (?, ?, ?, ?, 'user', ?);
    `,
    [
      'Normal',
      'User',
      'normal@example.test',
      'test-only-hash',
      new Date().toISOString(),
    ],
  );

  await assert.rejects(
    seed({
      databasePath,
      admin: { ...testAdmin, email: 'normal@example.test' },
    }),
    /appartiene gia a un utente normale/,
  );

  const user = await get(
    database,
    'SELECT role FROM users WHERE email = ?;',
    ['normal@example.test'],
  );
  assert.equal(user.role, 'user');
});

test('Express rispetta la base del contratto HTTP', async () => {
  const server = await startServer();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const rootResponse = await fetch(`${baseUrl}/`);
  assert.equal(rootResponse.status, 200);
  assert.equal(await rootResponse.text(), 'Server attivo');
  assert.equal(rootResponse.headers.has('x-powered-by'), false);

  const missingResponse = await fetch(`${baseUrl}/api/v1/missing`);
  assert.equal(missingResponse.status, 404);
  assert.deepEqual(await missingResponse.json(), {
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'La risorsa richiesta non esiste.',
    },
  });

  const invalidJsonResponse = await fetch(`${baseUrl}/api/v1/test`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"invalid":',
  });
  assert.equal(invalidJsonResponse.status, 400);
  assert.equal((await invalidJsonResponse.json()).error.code, 'INVALID_JSON');

  const largeBodyResponse = await fetch(`${baseUrl}/api/v1/test`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: 'x'.repeat(110 * 1024) }),
  });
  assert.equal(largeBodyResponse.status, 413);
  assert.equal((await largeBodyResponse.json()).error.code, 'PAYLOAD_TOO_LARGE');

  await stopServer();
  assert.throws(() => getDatabase(), /non e ancora connesso/);
});
