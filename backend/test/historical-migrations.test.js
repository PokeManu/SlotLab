const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");
const sqlite3 = require("sqlite3");

const { migrate } = require("../db/migrate");

const testDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), "slotlab-migration-recovery-"),
);
const fixturePath = path.join(__dirname, "fixtures", "pre-recovery.sqlite");

after(() => {
  fs.rmSync(testDirectory, { recursive: true, force: true });
});

function openDatabase(databasePath) {
  return new Promise((resolve, reject) => {
    const database = new sqlite3.Database(databasePath, (error) => {
      if (error) reject(error);
      else resolve(database);
    });
  });
}

function closeDatabase(database) {
  return new Promise((resolve, reject) => {
    database.close((error) => (error ? reject(error) : resolve()));
  });
}

function execute(database, sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, parameters, (error) =>
      error ? reject(error) : resolve(),
    );
  });
}

function all(database, sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, parameters, (error, rows) =>
      error ? reject(error) : resolve(rows),
    );
  });
}

function get(database, sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.get(sql, parameters, (error, row) =>
      error ? reject(error) : resolve(row),
    );
  });
}

async function copyFixture(filename) {
  assert.ok(
    fs.existsSync(fixturePath),
    `Fixture storica non trovata: ${fixturePath}`,
  );
  const databasePath = path.join(testDirectory, filename);
  fs.copyFileSync(fixturePath, databasePath);
  return databasePath;
}

async function snapshotTables(database) {
  const tables = await all(
    database,
    `SELECT name FROM sqlite_master
       WHERE type = 'table'
         AND name NOT LIKE 'sqlite_%'
         AND name <> 'schema_migrations'
       ORDER BY name;`,
  );
  const snapshot = {};
  for (const { name } of tables) {
    const columns = await all(database, `PRAGMA table_info("${name}");`);
    const names = columns.map(({ name: column }) => column);
    const projection = names.map((column) => `"${column}"`).join(", ");
    snapshot[name] = {
      columns: names,
      rows: await all(
        database,
        `SELECT ${projection} FROM "${name}" ORDER BY rowid;`,
      ),
    };
  }
  return snapshot;
}

async function assertStableLegacyData(databasePath, before) {
  const database = await openDatabase(databasePath);
  try {
    const after = await snapshotTables(database);
    for (const [table, expected] of Object.entries(before)) {
      const columns = expected.columns;
      const projection = columns.map((column) => `"${column}"`).join(", ");
      const actualRows = await all(
        database,
        `SELECT ${projection} FROM "${table}" ORDER BY rowid;`,
      );
      assert.deepEqual(
        actualRows,
        expected.rows,
        `I dati preesistenti della tabella ${table} sono cambiati`,
      );
      assert.ok(after[table], `La tabella preesistente ${table} è scomparsa`);
    }
  } finally {
    await closeDatabase(database);
  }
}

test("il database storico completa le migrazioni mancanti senza perdere dati", async () => {
  const databasePath = await copyFixture("legacy.sqlite");
  const beforeDatabase = await openDatabase(databasePath);
  const before = await snapshotTables(beforeDatabase);
  await closeDatabase(beforeDatabase);

  const firstRun = await migrate({ databasePath });
  assert.deepEqual(firstRun.appliedNow, [7, 8]);

  await assertStableLegacyData(databasePath, before);
  const checkDatabase = await openDatabase(databasePath);
  try {
    assert.deepEqual(await get(checkDatabase, "PRAGMA integrity_check;"), {
      integrity_check: "ok",
    });
    assert.deepEqual(await all(checkDatabase, "PRAGMA foreign_key_check;"), []);
    assert.deepEqual(
      await all(
        checkDatabase,
        "SELECT version FROM schema_migrations ORDER BY version;",
      ),
      [1, 2, 3, 4, 5, 6, 7, 8].map((version) => ({ version })),
    );
  } finally {
    await closeDatabase(checkDatabase);
  }

  assert.deepEqual(
    (await migrate({ databasePath })).appliedNow,
    [],
    "La seconda esecuzione deve essere idempotente",
  );
});

test("un database vuoto applica tutte le migrazioni e poi non ne riapplica nessuna", async () => {
  const databasePath = path.join(testDirectory, "fresh.sqlite");
  assert.deepEqual(
    (await migrate({ databasePath })).appliedNow,
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
  assert.deepEqual((await migrate({ databasePath })).appliedNow, []);
});

test("il controllo continua a rifiutare un checksum alterato", async () => {
  const databasePath = path.join(testDirectory, "tampered.sqlite");
  await migrate({ databasePath });
  const database = await openDatabase(databasePath);
  try {
    await execute(
      database,
      "UPDATE schema_migrations SET checksum = ? WHERE version = 1;",
      [crypto.createHash("sha256").update("intenzionalmente errato").digest("hex")],
    );
  } finally {
    await closeDatabase(database);
  }
  await assert.rejects(
    migrate({ databasePath }),
    /La migrazione 1 e stata modificata dopo l'applicazione\./,
  );
});
