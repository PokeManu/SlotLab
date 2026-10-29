const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "slotlab-favorites-"));
process.env.SLOTLAB_DB_PATH = path.join(directory, "favorites.sqlite");
process.env.NODE_ENV = "test";
process.env.HOST = "127.0.0.1";
process.env.PORT = "0";
process.env.SLOTLAB_JWT_SECRET = crypto.randomBytes(32).toString("hex");

const { startServer } = require("../server");
const { closeTestServer } = require("./helpers/close-server");
const { getDatabase } = require("../db/db");
const { queries } = require("../db/query");
const { hashPassword } = require("../security/password");

const password = "FavoritesFixture2026!";
let base;
let database;
let userToken;
let adminToken;
let server;

async function request(url, method = "GET", body, token = userToken) {
  const response = await fetch(`${base}/api/v1${url}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    status: response.status,
    body: response.status === 204 ? null : await response.json(),
  };
}

async function login(email) {
  const result = await request(
    "/auth/login",
    "POST",
    { email, password },
    null,
  );
  assert.equal(result.status, 200);
  return result.body.data.accessToken;
}

before(async () => {
  server = await startServer();
  base = `http://127.0.0.1:${server.address().port}`;
  database = queries(getDatabase());
  const passwordHash = await hashPassword(password);
  await database.run(
    `INSERT INTO users(first_name,last_name,email,password_hash,role,created_at)
     VALUES ('Favorite', 'User', ?, ?, 'user', ?),
            ('Favorite', 'Admin', ?, ?, 'admin', ?);`,
    [
      "favorite-user@example.test",
      passwordHash,
      new Date().toISOString(),
      "favorite-admin@example.test",
      passwordHash,
      new Date().toISOString(),
    ],
  );
  await database.run(
    "INSERT INTO buildings(number,name,address,latitude,longitude) VALUES (90,'Favorites test','Test address',38,13);",
  );
  await database.run(
    `INSERT INTO spaces(building_id,name,floor,type,capacity,accessible,status)
     VALUES (1,'Alpha room',0,'study_room',20,1,'active'),
            (1,'Beta room',1,'laboratory',12,0,'active');`,
  );
  userToken = await login("favorite-user@example.test");
  adminToken = await login("favorite-admin@example.test");
});

after(async () => {
  await closeTestServer(server);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("preferiti: elenco vuoto e paginazione espongono il contratto corrente", async () => {
  const result = await request("/favorites?page=1&size=1");
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    data: [],
    pagination: { page: 1, size: 1, totalElements: 0, totalPages: 0 },
  });
});

test("preferiti: aggiunta nuova e duplicato conservano gli status", async () => {
  const first = await request("/favorites/1", "POST");
  assert.equal(first.status, 201);
  assert.deepEqual(first.body, {
    data: { spaceId: 1, isFavorite: true },
  });
  const duplicate = await request("/favorites/1", "POST");
  assert.equal(duplicate.status, 200);
  const page = await request("/favorites?page=1&size=1");
  assert.equal(page.body.pagination.totalElements, 1);
  assert.equal(page.body.pagination.totalPages, 1);
  assert.equal(page.body.data[0].name, "Alpha room");
  assert.equal(page.body.data[0].isFavorite, true);
});

test("preferiti: cancellazione idempotente restituisce sempre 204", async () => {
  assert.equal((await request("/favorites/1", "DELETE")).status, 204);
  assert.equal((await request("/favorites/1", "DELETE")).status, 204);
  assert.equal((await request("/favorites")).body.pagination.totalElements, 0);
});

test("preferiti: paginazione e dati edificio restano completi", async () => {
  await request("/favorites/2", "POST");
  await request("/favorites/1", "POST");
  const firstPage = await request("/favorites?page=1&size=1");
  const secondPage = await request("/favorites?page=2&size=1");
  assert.equal(firstPage.status, 200);
  assert.equal(firstPage.body.pagination.totalElements, 2);
  assert.equal(firstPage.body.pagination.totalPages, 2);
  assert.equal(firstPage.body.data[0].name, "Alpha room");
  assert.deepEqual(firstPage.body.data[0].building, {
    id: 1,
    number: 90,
    name: "Favorites test",
  });
  assert.equal(firstPage.body.data[0].accessible, true);
  assert.equal(firstPage.body.data[0].imageType, "study_room");
  assert.equal(secondPage.body.data[0].name, "Beta room");
  await request("/favorites/1", "DELETE");
  await request("/favorites/2", "DELETE");
});

test("preferiti: paginazione non valida restituisce lo stesso errore", async () => {
  for (const query of ["?page=0", "?size=101"]) {
    const result = await request(`/favorites${query}`);
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "VALIDATION_ERROR");
    assert.equal(
      result.body.error.message,
      "I parametri di paginazione non sono validi.",
    );
  }
});

test("preferiti: ID non valido e spazio inesistente producono errori distinti", async () => {
  const invalid = await request("/favorites/not-an-id", "POST");
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, "INVALID_SPACE_ID");
  const missing = await request("/favorites/999", "POST");
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error.code, "SPACE_NOT_FOUND");
});

test("preferiti: autenticazione e ruolo sono applicati dalla route", async () => {
  assert.equal((await request("/favorites", "GET", undefined, null)).status, 401);
  assert.equal((await request("/favorites", "GET", undefined, adminToken)).status, 403);
});
