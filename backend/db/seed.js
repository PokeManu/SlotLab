const { closeDatabase, connectDatabase } = require('./db');
const { hashPassword } = require('../security/password');

const services = [
  { code: 'wifi', name: 'Wi-Fi' },
  { code: 'power_outlets', name: 'Prese elettriche' },
  { code: 'projector', name: 'Proiettore' },
  { code: 'computer', name: 'Computer' },
  { code: 'air_conditioning', name: 'Aria condizionata' },
];

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

function readAdminFromEnvironment(environment = process.env) {
  const variableNames = [
    'SLOTLAB_ADMIN_FIRST_NAME',
    'SLOTLAB_ADMIN_LAST_NAME',
    'SLOTLAB_ADMIN_EMAIL',
    'SLOTLAB_ADMIN_PASSWORD',
  ];
  const missingVariables = variableNames.filter(
    (variableName) => !environment[variableName],
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Variabili mancanti per l'amministratore: ${missingVariables.join(', ')}.`,
    );
  }

  return {
    firstName: environment.SLOTLAB_ADMIN_FIRST_NAME,
    lastName: environment.SLOTLAB_ADMIN_LAST_NAME,
    email: environment.SLOTLAB_ADMIN_EMAIL,
    password: environment.SLOTLAB_ADMIN_PASSWORD,
  };
}

function normalizeAndValidateAdmin(admin) {
  if (
    !admin ||
    typeof admin.firstName !== 'string' ||
    typeof admin.lastName !== 'string' ||
    typeof admin.email !== 'string' ||
    typeof admin.password !== 'string'
  ) {
    throw new Error("I dati dell'amministratore non sono completi.");
  }

  const firstName = admin.firstName.trim();
  const lastName = admin.lastName.trim();
  const email = admin.email.trim().toLowerCase();
  const password = admin.password;

  if (!firstName || !lastName) {
    throw new Error("Nome e cognome dell'amministratore sono obbligatori.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("L'email dell'amministratore non e valida.");
  }

  const validPassword =
    password.length >= 8 &&
    password.length <= 64 &&
    !/\s/.test(password) &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  if (!validPassword) {
    throw new Error(
      'La password deve avere 8-64 caratteri, senza spazi, con maiuscola, minuscola, numero e carattere speciale.',
    );
  }

  return { firstName, lastName, email, password };
}

async function insertServices(database) {
  for (const service of services) {
    await run(
      database,
      `
        INSERT INTO services (code, name)
        VALUES (?, ?)
        ON CONFLICT(code) DO UPDATE SET name = excluded.name;
      `,
      [service.code, service.name],
    );
  }
}

async function insertAdminIfMissing(database, admin) {
  const existingUser = await get(
    database,
    'SELECT id, role FROM users WHERE email = ?;',
    [admin.email],
  );

  if (existingUser) {
    if (existingUser.role !== 'admin') {
      throw new Error(
        `L'email ${admin.email} appartiene gia a un utente normale.`,
      );
    }

    return { adminCreated: false, adminId: existingUser.id };
  }

  const passwordHash = await hashPassword(admin.password);
  const result = await run(
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
      VALUES (?, ?, ?, ?, 'admin', ?);
    `,
    [
      admin.firstName,
      admin.lastName,
      admin.email,
      passwordHash,
      new Date().toISOString(),
    ],
  );

  return { adminCreated: true, adminId: result.lastId };
}

async function seed(options = {}) {
  const admin = normalizeAndValidateAdmin(
    options.admin || readAdminFromEnvironment(),
  );
  const database = await connectDatabase({ databasePath: options.databasePath });

  await execute(database, 'BEGIN IMMEDIATE TRANSACTION;');

  try {
    await insertServices(database);
    const adminResult = await insertAdminIfMissing(database, admin);
    await execute(database, 'COMMIT;');

    return {
      ...adminResult,
      adminEmail: admin.email,
      servicesCount: services.length,
    };
  } catch (error) {
    try {
      await execute(database, 'ROLLBACK;');
    } catch (rollbackError) {
      console.error(`Rollback non riuscito: ${rollbackError.message}`);
    }

    throw error;
  }
}

if (require.main === module) {
  seed()
    .then((result) => {
      console.log(`Servizi iniziali verificati: ${result.servicesCount}`);

      if (result.adminCreated) {
        console.log(`Amministratore creato: ${result.adminEmail}`);
      } else {
        console.log(`Amministratore gia presente: ${result.adminEmail}`);
      }
    })
    .catch((error) => {
      console.error(`Dati iniziali non inseriti: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        await closeDatabase();
      } catch (error) {
        console.error(`Chiusura del database non riuscita: ${error.message}`);
        process.exitCode = 1;
      }
    });
}

module.exports = {
  readAdminFromEnvironment,
  seed,
};
