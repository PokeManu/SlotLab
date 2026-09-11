const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const DEFAULT_DATABASE_PATH = path.join(__dirname, "database.sqlite");
const migrations = [
  {
    version: 1,
    name: "initial_schema",
    filePath: path.join(__dirname, "schema.sql"),
  },
  {
    version: 2,
    name: "slot_occurrences_integrity",
    filePath: path.join(
      __dirname,
      "migrations",
      "002-slot-occurrences-integrity.sql",
    ),
  },
  {
    version: 3,
    name: "file_deletions",
    filePath: path.join(__dirname, "migrations", "003-file-deletions.sql"),
  },
  {
    version: 4,
    name: "occurrence_tracking",
    filePath: path.join(__dirname, "migrations", "004-occurrence-tracking.sql"),
  },
  {
    version: 5,
    name: "profile_photos",
    filePath: path.join(__dirname, "migrations", "005-profile-photos.sql"),
  },
  {
    version: 6,
    name: "query_indexes",
    filePath: path.join(__dirname, "migrations", "006-query-indexes.sql"),
  },
  {
    version: 7,
    name: "availability_supersession",
    filePath: path.join(
      __dirname,
      "migrations",
      "007-availability-supersession.sql",
    ),
  },
  {
    version: 8,
    name: "report_photo_data",
    filePath: path.join(__dirname, "migrations", "008-report-photo-data.sql"),
  },
];
function openDatabase(databasePath) {
  return new Promise((resolve, reject) => {
    const database = new sqlite3.Database(databasePath, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(database);
    });
  });
}
function execute(database, sql) {
  return new Promise((resolve, reject) => {
    database.exec(sql, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
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
function closeDatabase(database) {
  return new Promise((resolve, reject) => {
    database.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
function calculateChecksum(sql) {
  return crypto.createHash("sha256").update(sql).digest("hex");
}
function resolveDatabasePath(customPath) {
  if (!customPath) {
    return DEFAULT_DATABASE_PATH;
  }
  return path.resolve(customPath);
}
async function prepareMigrationTable(database) {
  await execute(
    database,
    `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
        checksum TEXT NOT NULL CHECK (length(checksum) = 64),
        applied_at TEXT NOT NULL CHECK (length(trim(applied_at)) > 0)
      );
    `,
  );
}
async function readMigrations() {
  return Promise.all(
    migrations.map(async (migration) => {
      const sql = await fs.readFile(migration.filePath, "utf8");
      return {
        ...migration,
        sql,
        checksum: calculateChecksum(sql),
      };
    }),
  );
}
function verifyAppliedMigration(migration, appliedMigration) {
  if (appliedMigration.name !== migration.name) {
    throw new Error(
      `La migrazione ${migration.version} risulta applicata con un nome diverso.`,
    );
  }
  if (appliedMigration.checksum !== migration.checksum) {
    throw new Error(
      `La migrazione ${migration.version} e stata modificata dopo l'applicazione.`,
    );
  }
}
async function applyMigration(database, migration) {
  await execute(database, "BEGIN IMMEDIATE TRANSACTION;");
  try {
    await execute(database, migration.sql);
    await run(
      database,
      `
        INSERT INTO schema_migrations (version, name, checksum, applied_at)
        VALUES (?, ?, ?, ?);
      `,
      [
        migration.version,
        migration.name,
        migration.checksum,
        new Date().toISOString(),
      ],
    );
    await execute(database, "COMMIT;");
  } catch (error) {
    await execute(database, "ROLLBACK;");
    throw error;
  }
}
async function migrate(options = {}) {
  const databasePath = resolveDatabasePath(
    options.databasePath || process.env.SLOTLAB_DB_PATH,
  );
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  const database = await openDatabase(databasePath);
  const appliedNow = [];
  try {
    await execute(database, "PRAGMA foreign_keys = ON;");
    await execute(database, "PRAGMA busy_timeout = 5000;");
    await prepareMigrationTable(database);
    const availableMigrations = await readMigrations();
    const appliedRows = await all(
      database,
      "SELECT version, name, checksum FROM schema_migrations ORDER BY version;",
    );
    const appliedByVersion = new Map(
      appliedRows.map((migration) => [migration.version, migration]),
    );
    for (const migration of availableMigrations) {
      const appliedMigration = appliedByVersion.get(migration.version);
      if (appliedMigration) {
        verifyAppliedMigration(migration, appliedMigration);
        continue;
      }
      await applyMigration(database, migration);
      appliedNow.push(migration.version);
    }
    const foreignKeyErrors = await all(database, "PRAGMA foreign_key_check;");
    if (foreignKeyErrors.length > 0) {
      throw new Error(
        "Il controllo finale delle chiavi esterne non e riuscito.",
      );
    }
    return { databasePath, appliedNow };
  } finally {
    await closeDatabase(database);
  }
}
if (require.main === module) {
  migrate()
    .then(({ databasePath, appliedNow }) => {
      if (appliedNow.length === 0) {
        console.log(`Database gia aggiornato: ${databasePath}`);
        return;
      }
      console.log(
        `Migrazioni applicate (${appliedNow.join(", ")}): ${databasePath}`,
      );
    })
    .catch((error) => {
      console.error(`Migrazione non riuscita: ${error.message}`);
      process.exitCode = 1;
    });
}
module.exports = {
  DEFAULT_DATABASE_PATH,
  migrate,
};
