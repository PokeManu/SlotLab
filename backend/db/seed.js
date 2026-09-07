const { closeDatabase, connectDatabase } = require('./db');
const { hashPassword } = require('../security/password');
const { normalizeAndValidateAccount } = require('../security/validation');

const services = [
  { code: 'wifi', name: 'Wi-Fi' },
  { code: 'power_outlets', name: 'Prese elettriche' },
  { code: 'projector', name: 'Proiettore' },
  { code: 'computer', name: 'Computer' },
  { code: 'air_conditioning', name: 'Aria condizionata' },
];

const catalog = [
  { number: 6, name: 'Edificio 6', address: 'Viale delle Scienze, Edificio 6, Palermo', latitude: 38.1059492, longitude: 13.3504286, spaces: [
    { name: 'Aula Studio A1', floor: 2, type: 'study_room', capacity: 24, accessible: 1, services: ['wifi', 'power_outlets'] },
    { name: 'Sala Riunioni B', floor: 1, type: 'meeting_room', capacity: 12, accessible: 1, services: ['wifi', 'projector'] },
  ] },
  { number: 9, name: 'Edificio 9', address: 'Viale delle Scienze, Edificio 9, Palermo', latitude: 38.1036268, longitude: 13.3457991, spaces: [
    { name: 'Laboratorio Reti', floor: 1, type: 'laboratory', capacity: 18, accessible: 1, services: ['wifi', 'computer', 'projector'] },
  ] },
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

async function insertCatalog(database) {
  for (const buildingData of catalog) {
    await run(database, `INSERT INTO buildings (number, name, address, latitude, longitude) VALUES (?, ?, ?, ?, ?) ON CONFLICT(number) DO UPDATE SET name = excluded.name, address = excluded.address, latitude = excluded.latitude, longitude = excluded.longitude;`, [buildingData.number, buildingData.name, buildingData.address, buildingData.latitude, buildingData.longitude]);
    const building = await get(database, 'SELECT id FROM buildings WHERE number = ?;', [buildingData.number]);
    for (const spaceData of buildingData.spaces) {
      const existingSpace = await get(database, 'SELECT id FROM spaces WHERE building_id = ? AND name = ?;', [building.id, spaceData.name]);
      if (!existingSpace) await run(database, `INSERT INTO spaces (building_id, name, floor, type, capacity, accessible, status) VALUES (?, ?, ?, ?, ?, ?, 'active');`, [building.id, spaceData.name, spaceData.floor, spaceData.type, spaceData.capacity, spaceData.accessible]);
      const space = await get(database, 'SELECT id FROM spaces WHERE building_id = ? AND name = ?;', [building.id, spaceData.name]);
      for (const code of spaceData.services) {
        const service = await get(database, 'SELECT id FROM services WHERE code = ?;', [code]);
        await run(database, 'INSERT OR IGNORE INTO space_services (space_id, service_id) VALUES (?, ?);', [space.id, service.id]);
      }
      for (let weekday = 1; weekday <= 5; weekday += 1) {
        await run(database, `INSERT OR IGNORE INTO availabilities (space_id, valid_from, valid_until, weekday, start_time, end_time, is_retired) VALUES (?, '2026-01-01', '2099-12-31', ?, '08:00', '20:00', 0);`, [space.id, weekday]);
      }
    }
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
  const admin = normalizeAndValidateAccount(
    options.admin || readAdminFromEnvironment(),
  );
  const database = await connectDatabase({ databasePath: options.databasePath });

  await execute(database, 'BEGIN IMMEDIATE TRANSACTION;');

  try {
    await insertServices(database);
    await insertCatalog(database);
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
