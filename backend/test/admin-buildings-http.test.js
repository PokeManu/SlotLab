const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { before, after, test } = require("node:test");

const directory = fs.mkdtempSync(
  path.join(os.tmpdir(), "slotlab-admin-buildings-"),
);
process.env.SLOTLAB_DB_PATH = path.join(directory, "buildings.sqlite");
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

async function request(method, endpoint, token, body) {
  const response = await fetch(`${base}/api/v1${endpoint}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

async function login(email) {
  const result = await request("POST", "/auth/login", null, {
    email,
    password: "BuildingsFixture2026!",
  });
  assert.equal(result.status, 200);
  return result.body.data.accessToken;
}

before(async () => {
  server = await startServer();
  base = `http://127.0.0.1:${server.address().port}`;
  const db = queries(getDatabase());
  const passwordHash = await hashPassword("BuildingsFixture2026!");
  const createdAt = new Date().toISOString();
  await db.run(
    `INSERT INTO users(first_name,last_name,email,password_hash,role,created_at)
     VALUES ('Building','Admin',?,?, 'admin',?),
            ('Building','User',?,?, 'user',?);`,
    [
      "buildings-admin@example.test",
      passwordHash,
      createdAt,
      "buildings-user@example.test",
      passwordHash,
      createdAt,
    ],
  );
  adminToken = await login("buildings-admin@example.test");
  userToken = await login("buildings-user@example.test");
});

after(async () => {
  try {
    await closeTestServer(server);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("edifici admin: CRUD, conflitto sul numero e autorizzazioni", async () => {
  assert.equal(
    (await request("GET", "/admin/buildings", null)).status,
    401,
  );
  assert.equal(
    (await request("GET", "/admin/buildings", userToken)).status,
    403,
  );

  const first = await request("POST", "/admin/buildings", adminToken, {
    number: 901,
    name: "Edificio HTTP",
    address: "Via HTTP 1, Palermo",
    latitude: 38.1,
    longitude: 13.3,
  });
  assert.equal(first.status, 201);
  assert.deepEqual(first.body.data, {
    id: first.body.data.id,
    number: 901,
    name: "Edificio HTTP",
    address: "Via HTTP 1, Palermo",
    latitude: 38.1,
    longitude: 13.3,
  });
  const firstId = first.body.data.id;

  const duplicate = await request("POST", "/admin/buildings", adminToken, {
    number: 901,
    name: "Edificio duplicato",
    address: "Via duplicata 1, Palermo",
    latitude: 38.2,
    longitude: 13.4,
  });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error.code, "BUILDING_NUMBER_ALREADY_EXISTS");

  const second = await request("POST", "/admin/buildings", adminToken, {
    number: 902,
    name: "Edificio secondario",
    address: "Via HTTP 2, Palermo",
    latitude: 38.11,
    longitude: 13.31,
  });
  assert.equal(second.status, 201);
  const secondId = second.body.data.id;

  const list = await request("GET", "/admin/buildings", adminToken);
  assert.equal(list.status, 200);
  assert.deepEqual(
    list.body.data.filter(({ id }) => [firstId, secondId].includes(id)),
    [first.body.data, second.body.data],
  );

  const detail = await request(
    "GET",
    `/admin/buildings/${firstId}`,
    adminToken,
  );
  assert.equal(detail.status, 404);
  assert.equal(detail.body.error.code, "ROUTE_NOT_FOUND");

  const updated = await request(
    "PATCH",
    `/admin/buildings/${firstId}`,
    adminToken,
    {
      number: 903,
      name: "Edificio HTTP aggiornato",
      address: "Via HTTP 3, Palermo",
      latitude: 38.12,
      longitude: 13.32,
    },
  );
  assert.equal(updated.status, 200);
  assert.deepEqual(updated.body.data, {
    id: firstId,
    number: 903,
    name: "Edificio HTTP aggiornato",
    address: "Via HTTP 3, Palermo",
    latitude: 38.12,
    longitude: 13.32,
  });

  const conflictingUpdate = await request(
    "PATCH",
    `/admin/buildings/${firstId}`,
    adminToken,
    { number: 902 },
  );
  assert.equal(conflictingUpdate.status, 409);
  assert.equal(
    conflictingUpdate.body.error.code,
    "BUILDING_NUMBER_ALREADY_EXISTS",
  );

  assert.equal(
    (await request("DELETE", `/admin/buildings/${firstId}`, adminToken))
      .status,
    204,
  );
  const removedDetail = await request(
    "GET",
    `/admin/buildings/${firstId}`,
    adminToken,
  );
  assert.equal(removedDetail.status, 404);
  assert.equal(removedDetail.body.error.code, "ROUTE_NOT_FOUND");
  assert.equal(
    (await request("DELETE", `/admin/buildings/${secondId}`, adminToken))
      .status,
    204,
  );
});
