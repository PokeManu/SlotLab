const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, test } = require('node:test');
const sqlite3 = require('sqlite3');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'slotlab-backend-'));
const databasePath = path.join(testDirectory, 'database.sqlite');

process.env.SLOTLAB_DB_PATH = databasePath;
process.env.PORT = '0';
process.env.HOST = '127.0.0.1';
process.env.NODE_ENV = 'test';
process.env.SLOTLAB_JWT_SECRET = crypto.randomBytes(32).toString('hex');

const { connectDatabase, getDatabase } = require('../db/db');
const { migrate } = require('../db/migrate');
const { seed } = require('../db/seed');
const { verifyPassword } = require('../security/password');
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

function execute(database, sql) {
  return new Promise((resolve, reject) => {
    database.exec(sql, (error) => (error ? reject(error) : resolve()));
  });
}

async function openTestDatabase(t, filename) {
  const filePath = path.join(testDirectory, filename);
  const database = await new Promise((resolve, reject) => {
    const connection = new sqlite3.Database(filePath, (error) => {
      if (error) reject(error);
      else resolve(connection);
    });
  });
  t.after(() => new Promise((resolve, reject) => {
    database.close((error) => (error ? reject(error) : resolve()));
  }));
  await execute(database, 'PRAGMA foreign_keys = ON;');
  return { database, filePath };
}

async function insertTestSpace(database) {
  await execute(database, `
    INSERT INTO buildings VALUES (1, 1, 'Test', 'Test', 38, 13);
    INSERT INTO spaces VALUES (1, 1, 'Test', 0, 'study_room', 20, 1, 'active');
  `);
}

async function createVersionOneDatabase(t, filename) {
  const result = await openTestDatabase(t, filename);
  const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
  await execute(result.database, schema);
  await execute(result.database, `
    CREATE TABLE schema_migrations (
      version INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL, applied_at TEXT NOT NULL
    );
  `);
  await run(result.database, 'INSERT INTO schema_migrations VALUES (1, ?, ?, ?);', [
    'initial_schema',
    crypto.createHash('sha256').update(schema).digest('hex'),
    new Date().toISOString(),
  ]);
  await insertTestSpace(result.database);
  return result;
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

  assert.deepEqual(firstRun.appliedNow, [1, 2, 3, 4, 5]);
  assert.deepEqual(secondRun.appliedNow, []);
});

test('gli snapshot accettano solo stati coerenti in inserimento e aggiornamento', async (t) => {
  const { database, filePath } = await openTestDatabase(t, 'snapshots.sqlite');
  await migrate({ databasePath: filePath });
  await insertTestSpace(database);
  const finalizedAt = '2026-09-05T10:00:00.000Z';
  const insert = `
    INSERT INTO slot_occurrences (
      space_id, date, start_time, end_time, offered_capacity, was_offered, finalized_at
    ) VALUES (1, '2026-09-05', '12:00', '14:00', ?, ?, ?);
  `;
  const validStates = [[null, null, null], [20, 1, finalizedAt], [0, 0, finalizedAt]];
  for (const state of validStates) {
    await run(database, insert, state);
    await run(database, 'DELETE FROM slot_occurrences;');
  }
  const invalidStates = [
    [null, 1, finalizedAt], [null, 0, finalizedAt],
    [20, null, finalizedAt], [0, null, finalizedAt], [null, null, finalizedAt],
    [20, 1, null], [0, 0, null], [20, null, null], [null, 1, null],
    [0, 1, finalizedAt], [-1, 1, finalizedAt], [20, 0, finalizedAt],
    [20, 2, finalizedAt], [20, 1, ''],
  ];
  for (const state of invalidStates) {
    await assert.rejects(run(database, insert, state), /CHECK constraint failed/);
  }
  await run(database, insert, validStates[0]);
  const update = `UPDATE slot_occurrences
    SET offered_capacity = ?, was_offered = ?, finalized_at = ?;`;
  for (const state of invalidStates) {
    await assert.rejects(run(database, update, state), /CHECK constraint failed/);
  }
  await run(database, update, validStates[1]);
  assert.deepEqual(await get(database, `
    SELECT offered_capacity, was_offered, finalized_at FROM slot_occurrences;
  `), { offered_capacity: 20, was_offered: 1, finalized_at: finalizedAt });
});

test('la migrazione 2 conserva dati, vincoli e ID gia utilizzati', async (t) => {
  for (const keepRows of [true, false]) {
    const { database, filePath } = await createVersionOneDatabase(t, `upgrade-${keepRows}.sqlite`);
    await execute(database, `
      INSERT INTO slot_occurrences VALUES
        (1, 1, '2026-09-05', '12:00', '14:00', NULL, NULL, NULL),
        (2, 1, '2026-09-06', '12:00', '14:00', 20, 1, '2026-09-06T10:00:00.000Z'),
        (3, 1, '2026-09-07', '12:00', '14:00', 0, 0, '2026-09-07T10:00:00.000Z'),
        (50, 1, '2026-09-08', '12:00', '14:00', NULL, NULL, NULL);
    `);
    await run(database, keepRows ? 'DELETE FROM slot_occurrences WHERE id = 50;' : 'DELETE FROM slot_occurrences;');
    const originalRows = await all(database, 'SELECT * FROM slot_occurrences ORDER BY id;');
    assert.deepEqual((await migrate({ databasePath: filePath })).appliedNow, [2, 3, 4, 5]);
    assert.deepEqual(await all(database, 'SELECT * FROM slot_occurrences ORDER BY id;'), originalRows);
    assert.deepEqual((await migrate({ databasePath: filePath })).appliedNow, []);
    const insert = `INSERT INTO slot_occurrences (space_id, date, start_time, end_time)
      VALUES (?, '2026-09-09', '12:00', '14:00');`;
    assert.equal((await run(database, insert, [1])).lastId, 51);
    await assert.rejects(run(database, insert, [1]), /UNIQUE constraint failed/);
    await assert.rejects(run(database, insert, [999]), /FOREIGN KEY constraint failed/);
    assert.deepEqual(await all(database, 'PRAGMA foreign_key_check;'), []);
    await run(database, 'DELETE FROM spaces WHERE id = 1;');
    assert.equal((await get(database, 'SELECT COUNT(*) AS count FROM slot_occurrences;')).count, 0);
  }
});

test('dati storici incompleti annullano la migrazione 2 senza perdere dati', async (t) => {
  const { database, filePath } = await createVersionOneDatabase(t, 'invalid-history.sqlite');
  await execute(database, `
    INSERT INTO slot_occurrences VALUES
      (1, 1, '2026-09-05', '12:00', '14:00', NULL, NULL, NULL),
      (2, 1, '2026-09-06', '12:00', '14:00', NULL, 1, '2026-09-06T10:00:00.000Z');
  `);
  const originalRows = await all(database, 'SELECT * FROM slot_occurrences ORDER BY id;');
  await assert.rejects(migrate({ databasePath: filePath }), /CHECK constraint failed/);
  assert.deepEqual(await all(database, 'SELECT * FROM slot_occurrences ORDER BY id;'), originalRows);
  assert.deepEqual(await all(database, 'SELECT version FROM schema_migrations;'), [{ version: 1 }]);
  assert.equal(await get(database, "SELECT name FROM sqlite_master WHERE name = 'slot_occurrences_new';"), undefined);
  await run(database, 'UPDATE slot_occurrences SET offered_capacity = 20 WHERE id = 2;');
  assert.deepEqual((await migrate({ databasePath: filePath })).appliedNow, [2, 3, 4, 5]);
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
        AND name NOT IN ('schema_migrations', 'file_deletions', 'occurrence_tracking', 'occurrence_issues');
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
  const secondRun = await seed({
    databasePath,
    admin: { ...testAdmin, password: 'DifferentPassword2026!' },
  });
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
  assert.equal(await verifyPassword(testAdmin.password, admin.password_hash), true);
  assert.equal(await verifyPassword('DifferentPassword2026!', admin.password_hash), false);
});

test('il seed rifiuta password non valide', async () => {
  const invalidDatabasePath = path.join(testDirectory, 'invalid-password.sqlite');
  for (const password of ['debole', ' TestAdmin2026!', 'TestAdmin2026!\n']) {
    await assert.rejects(
      seed({
        databasePath: invalidDatabasePath,
        admin: { ...testAdmin, email: 'weak@example.test', password },
      }),
      /La password deve avere 8-64 caratteri/,
    );
  }
  assert.equal(fs.existsSync(invalidDatabasePath), false);
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
