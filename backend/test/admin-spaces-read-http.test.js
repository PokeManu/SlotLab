const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");

const directory = fs.mkdtempSync(
  path.join(os.tmpdir(), "slotlab-admin-spaces-read-"),
);
process.env.SLOTLAB_DB_PATH = path.join(directory, "spaces.sqlite");
process.env.NODE_ENV = "test";
process.env.HOST = "127.0.0.1";
process.env.PORT = "0";
process.env.SLOTLAB_JWT_SECRET = crypto.randomBytes(32).toString("hex");

const { startServer } = require("../server");
const { closeTestServer } = require("./helpers/close-server");
const { getDatabase } = require("../db/db");
const { queries } = require("../db/query");
const { hashPassword } = require("../security/password");

let base;
let server;
let adminToken;
let userToken;
let firstSpaceId;

async function request(endpoint, token) {
  const response = await fetch(`${base}/api/v1${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

async function login(email) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "AdminSpacesFixture2026!" }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).data.accessToken;
}

before(async () => {
  server = await startServer();
  base = `http://127.0.0.1:${server.address().port}`;
  const db = queries(getDatabase());
  const passwordHash = await hashPassword("AdminSpacesFixture2026!");
  const createdAt = new Date().toISOString();

  await db.run(
    `INSERT INTO users(first_name,last_name,email,password_hash,role,created_at)
     VALUES ('Spaces','Admin',?,?, 'admin',?),
            ('Spaces','User',?,?, 'user',?);`,
    [
      "admin-spaces@example.test",
      passwordHash,
      createdAt,
      "user-spaces@example.test",
      passwordHash,
      createdAt,
    ],
  );
  await db.run(
    `INSERT INTO buildings(number,name,address,latitude,longitude)
     VALUES (801,'Edificio Spazi','Via Spazi 1, Palermo',38.1,13.3);`,
  );
  await db.run(
    `INSERT INTO services(code,name) VALUES
     ('wifi','Wi-Fi'),
     ('power_outlets','Prese elettriche');`,
  );
  const building = await db.get("SELECT id FROM buildings WHERE number = 801;");
  const first = await db.run(
    `INSERT INTO spaces(building_id,name,floor,type,capacity,accessible,status)
     VALUES (?,?,?,?,?,?,?);`,
    [building.id, "Aula Alfa", 1, "study_room", 24, 1, "active"],
  );
  firstSpaceId = first.lastId;
  await db.run(
    `INSERT INTO spaces(building_id,name,floor,type,capacity,accessible,status)
     VALUES (?,?,?,?,?,?,?), (?,?,?,?,?,?,?);`,
    [
      building.id,
      "Aula Beta",
      2,
      "meeting_room",
      12,
      0,
      "active",
      building.id,
      "Laboratorio Gamma",
      0,
      "laboratory",
      18,
      1,
      "maintenance",
    ],
  );
  const wifi = await db.get("SELECT id FROM services WHERE code = 'wifi';");
  const power = await db.get(
    "SELECT id FROM services WHERE code = 'power_outlets';",
  );
  await db.run(
    "INSERT INTO space_services(space_id,service_id) VALUES (?,?),(?,?);",
    [firstSpaceId, wifi.id, firstSpaceId, power.id],
  );

  adminToken = await login("admin-spaces@example.test");
  userToken = await login("user-spaces@example.test");
});

after(async () => {
  try {
    await closeTestServer(server);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("lista admin degli spazi: ricerca, paginazione e totale", async () => {
  const result = await request("/admin/spaces?search=Aula&page=2&size=1", adminToken);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.pagination, {
    page: 2,
    size: 1,
    totalElements: 2,
    totalPages: 2,
  });
  assert.equal(result.body.data.length, 1);
  assert.equal(result.body.data[0].name, "Aula Beta");
  assert.deepEqual(result.body.data[0].building, {
    id: 1,
    number: 801,
    name: "Edificio Spazi",
  });
});

test("dettaglio admin dello spazio include edificio e servizi", async () => {
  const result = await request(`/admin/spaces/${firstSpaceId}`, adminToken);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    data: {
      id: firstSpaceId,
      name: "Aula Alfa",
      building: {
        id: 1,
        number: 801,
        name: "Edificio Spazi",
      },
      floor: 1,
      type: "study_room",
      capacity: 24,
      accessible: true,
      status: "active",
      serviceCodes: ["power_outlets", "wifi"],
    },
  });
});

test("dettaglio admin degli spazi gestisce ID non validi e autorizzazioni", async () => {
  const invalid = await request("/admin/spaces/not-a-number", adminToken);
  assert.equal(invalid.status, 400);
  assert.deepEqual(invalid.body.error, {
    code: "INVALID_SPACE_ID",
    message: "Identificativo spazio non valido.",
  });

  const missing = await request("/admin/spaces/9999", adminToken);
  assert.equal(missing.status, 404);
  assert.deepEqual(missing.body.error, {
    code: "SPACE_NOT_FOUND",
    message: "Lo spazio richiesto non esiste.",
  });

  assert.equal((await request("/admin/spaces")).status, 401);
  assert.equal((await request("/admin/spaces", userToken)).status, 403);
  assert.equal((await request(`/admin/spaces/${firstSpaceId}`, userToken)).status, 403);
});
