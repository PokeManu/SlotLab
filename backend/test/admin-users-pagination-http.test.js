const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");

const directory = fs.mkdtempSync(
  path.join(os.tmpdir(), "slotlab-admin-users-pagination-"),
);
process.env.SLOTLAB_DB_PATH = path.join(directory, "database.sqlite");
process.env.NODE_ENV = "test";
process.env.HOST = "127.0.0.1";
process.env.PORT = "0";
process.env.SLOTLAB_JWT_SECRET = crypto.randomBytes(32).toString("hex");

const { startServer } = require("../server");
const { closeTestServer } = require("./helpers/close-server");
const { getDatabase } = require("../db/db");
const { queries } = require("../db/query");
const { hashPassword } = require("../security/password");

let baseUrl;
let server;
let adminToken;
let userToken;

async function login(email) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "AdminUsersFixture2026!" }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).data.accessToken;
}

async function listUsers(query = "", token = adminToken) {
  const response = await fetch(`${baseUrl}/api/v1/admin/users${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { response, body: await response.json() };
}

before(async () => {
  server = await startServer();
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const passwordHash = await hashPassword("AdminUsersFixture2026!");
  const now = new Date().toISOString();
  await queries(getDatabase()).run(
    `INSERT INTO users(first_name,last_name,email,password_hash,role,created_at)
     VALUES (?, ?, ?, ?, 'admin', ?),
            (?, ?, ?, ?, 'user', ?),
            (?, ?, ?, ?, 'user', ?),
            (?, ?, ?, ?, 'user', ?);`,
    [
      "Admin",
      "Root",
      "admin-users-fixture@example.test",
      passwordHash,
      now,
      "Mario",
      "Alpha",
      "mario.alpha@example.test",
      passwordHash,
      now,
      "Mario",
      "Beta",
      "mario.beta@example.test",
      passwordHash,
      now,
      "Lucia",
      "Gamma",
      "lucia.gamma@example.test",
      passwordHash,
      now,
    ],
  );
  adminToken = await login("admin-users-fixture@example.test");
  userToken = await login("mario.alpha@example.test");
});

after(async () => {
  try {
    await closeTestServer(server);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("admin users: elenco senza filtro restituisce totale e pagine coerenti", async () => {
  const firstPage = await listUsers("?page=1&size=1");
  assert.equal(firstPage.response.status, 200);
  assert.deepEqual(firstPage.body.pagination, {
    page: 1,
    size: 1,
    totalElements: 4,
    totalPages: 4,
  });
  assert.equal(firstPage.body.data[0].email, "mario.alpha@example.test");

  const secondPage = await listUsers("?page=2&size=1");
  assert.equal(secondPage.response.status, 200);
  assert.deepEqual(secondPage.body.pagination, {
    page: 2,
    size: 1,
    totalElements: 4,
    totalPages: 4,
  });
  assert.equal(secondPage.body.data[0].email, "mario.beta@example.test");
});

test("admin users: ricerca limita il totale e una ricerca vuota non trova risultati", async () => {
  const search = await listUsers("?page=1&size=1&search=Mario");
  assert.equal(search.response.status, 200);
  assert.deepEqual(search.body.pagination, {
    page: 1,
    size: 1,
    totalElements: 2,
    totalPages: 2,
  });
  assert.equal(search.body.data[0].email, "mario.alpha@example.test");

  const empty = await listUsers("?page=1&size=20&search=missing");
  assert.equal(empty.response.status, 200);
  assert.deepEqual(empty.body.pagination, {
    page: 1,
    size: 20,
    totalElements: 0,
    totalPages: 0,
  });
  assert.deepEqual(empty.body.data, []);
});

test("admin users: autenticazione e ruolo restano obbligatori", async () => {
  const anonymous = await listUsers("", null);
  assert.equal(anonymous.response.status, 401);

  const user = await listUsers("", userToken);
  assert.equal(user.response.status, 403);
});

test("admin users: il dettaglio rimosso restituisce il 404 comune", async () => {
  const response = await fetch(`${baseUrl}/api/v1/admin/users/1`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const body = await response.json();
  assert.equal(response.status, 404);
  assert.equal(body.error.code, "ROUTE_NOT_FOUND");
});
