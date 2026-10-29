const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { before, after, test } = require("node:test");

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "slotlab-pagination-"));
process.env.SLOTLAB_DB_PATH = path.join(directory, "pagination.sqlite");
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

async function login(email) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "PaginationFixture2026!" }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).data.accessToken;
}

before(async () => {
  server = await startServer();
  base = `http://127.0.0.1:${server.address().port}`;
  const db = queries(getDatabase());
  const hash = await hashPassword("PaginationFixture2026!");
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO users(first_name,last_name,email,password_hash,role,created_at)
     VALUES ('Page','User',?,?,'user',?),
            ('Page','Admin',?,?,'admin',?);`,
    ["pagination-user@example.test", hash, now,
      "pagination-admin@example.test", hash, now],
  );
  userToken = await login("pagination-user@example.test");
  adminToken = await login("pagination-admin@example.test");
});

after(async () => {
  try {
    await closeTestServer(server);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

async function expectPaginationError(route, token) {
  for (const invalid of ["page=0", "page=1.5", "size=101"]) {
    const response = await fetch(`${base}/api/v1${route}?${invalid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 400, `${route}?${invalid}`);
    assert.deepEqual(await response.json(), {
      error: {
        code: "VALIDATION_ERROR",
        message: "I parametri di paginazione non sono validi.",
      },
    });
  }
}

test("la paginazione mantiene lo stesso errore nelle liste utente", async () => {
  for (const route of ["/spaces", "/bookings", "/favorites", "/reports", "/notifications"]) {
    await expectPaginationError(route, userToken);
  }
});

test("la paginazione mantiene lo stesso errore nelle liste admin", async () => {
  for (const route of ["/admin/spaces", "/admin/bookings", "/admin/users"]) {
    await expectPaginationError(route, adminToken);
  }
});
