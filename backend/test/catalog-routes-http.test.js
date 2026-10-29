const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { before, after, test } = require("node:test");

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "slotlab-catalog-routes-"));
process.env.SLOTLAB_DB_PATH = path.join(directory, "catalog.sqlite");
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
let userToken;
let adminToken;
let server;

async function get(url, token = userToken) {
  const response = await fetch(`${base}/api/v1${url}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: response.status, body: await response.json() };
}

async function login(email) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "CatalogFixture2026!" }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).data.accessToken;
}

before(async () => {
  server = await startServer();
  base = `http://127.0.0.1:${server.address().port}`;
  const db = queries(getDatabase());
  const hash = await hashPassword("CatalogFixture2026!");
  await db.run(
    `INSERT INTO users(first_name,last_name,email,password_hash,role,created_at)
     VALUES ('Catalog','User',?,?,'user',?),
            ('Catalog','Admin',?,?,'admin',?);`,
    ["catalog-user@example.test", hash, new Date().toISOString(),
      "catalog-admin@example.test", hash, new Date().toISOString()],
  );
  await db.run(
    "INSERT INTO buildings(number,name,address,latitude,longitude) VALUES (91,'Edificio test','Via test',38,13);",
  );
  await db.run(
    `INSERT INTO spaces(building_id,name,floor,type,capacity,accessible,status)
     VALUES (1,'Aula test',0,'study_room',10,1,'active');`,
  );
  userToken = await login("catalog-user@example.test");
  adminToken = await login("catalog-admin@example.test");
});

after(async () => {
  try {
    await closeTestServer(server);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("le due route GET edificio rimosse restituiscono il 404 comune", async () => {
  for (const url of ["/buildings/1", "/buildings/1/spaces"]) {
    const result = await get(url);
    assert.equal(result.status, 404);
    assert.deepEqual(result.body, {
      error: {
        code: "ROUTE_NOT_FOUND",
        message: "La risorsa richiesta non esiste.",
      },
    });
    assert.equal((await get(url, null)).status, 401);
    assert.equal((await get(url, adminToken)).status, 403);
  }
});

test("elenchi e dettaglio dello spazio restano disponibili", async () => {
  const buildings = await get("/buildings");
  assert.equal(buildings.status, 200);
  assert.equal(buildings.body.data[0].name, "Edificio test");

  const spaces = await get("/spaces?page=1&size=1");
  assert.equal(spaces.status, 200);
  assert.equal(spaces.body.pagination.totalElements, 1);
  assert.equal(spaces.body.data[0].building.id, 1);

  const space = await get("/spaces/1");
  assert.equal(space.status, 200);
  assert.equal(space.body.data.name, "Aula test");
  assert.equal(space.body.data.building.name, "Edificio test");

  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const availability = await get(`/spaces/1/availability?date=${date}`);
  assert.equal(availability.status, 200);
  assert.deepEqual(availability.body, { data: [] });
});

test("le route mantenute richiedono utente autenticato", async () => {
  assert.equal((await get("/buildings", null)).status, 401);
  assert.equal((await get("/spaces", adminToken)).status, 403);
});
