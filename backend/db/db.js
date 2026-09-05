const sqlite3 = require('sqlite3').verbose();
const { migrate } = require('./migrate');

let database = null;
let connectionPromise = null;

function openDatabase(databasePath) {
  return new Promise((resolve, reject) => {
    const newDatabase = new sqlite3.Database(databasePath, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(newDatabase);
    });
  });
}

function execute(databaseConnection, sql) {
  return new Promise((resolve, reject) => {
    databaseConnection.exec(sql, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function get(databaseConnection, sql) {
  return new Promise((resolve, reject) => {
    databaseConnection.get(sql, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

function closeConnection(databaseConnection) {
  return new Promise((resolve, reject) => {
    databaseConnection.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function createConnection(options) {
  const migrationResult = await migrate(options);
  const newDatabase = await openDatabase(migrationResult.databasePath);

  try {
    await execute(newDatabase, 'PRAGMA foreign_keys = ON;');
    await execute(newDatabase, 'PRAGMA busy_timeout = 5000;');

    const foreignKeys = await get(newDatabase, 'PRAGMA foreign_keys;');
    if (foreignKeys.foreign_keys !== 1) {
      throw new Error('Le chiavi esterne SQLite non sono attive.');
    }

    database = newDatabase;
    return database;
  } catch (error) {
    await closeConnection(newDatabase);
    throw error;
  }
}

function connectDatabase(options = {}) {
  if (database) {
    return Promise.resolve(database);
  }

  if (!connectionPromise) {
    connectionPromise = createConnection(options).finally(() => {
      connectionPromise = null;
    });
  }

  return connectionPromise;
}

function getDatabase() {
  if (!database) {
    throw new Error('Il database non e ancora connesso.');
  }

  return database;
}

async function closeDatabase() {
  if (connectionPromise) {
    await connectionPromise;
  }

  if (!database) {
    return;
  }

  const connectionToClose = database;
  database = null;
  await closeConnection(connectionToClose);
}

module.exports = {
  closeDatabase,
  connectDatabase,
  getDatabase,
};
