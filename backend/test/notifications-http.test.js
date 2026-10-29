const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { before, after, test } = require("node:test");

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "slotlab-notifications-"));
process.env.SLOTLAB_DB_PATH = path.join(directory, "notifications.sqlite");
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
let database;
let firstToken;
let secondToken;
let adminToken;
let server;

async function request(url, method = "GET", token = firstToken) {
  const response = await fetch(`${base}/api/v1/notifications${url}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return {
    status: response.status,
    body: response.status === 204 ? null : await response.json(),
  };
}

async function login(email) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "NotificationsFixture2026!" }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).data.accessToken;
}

before(async () => {
  server = await startServer();
  base = `http://127.0.0.1:${server.address().port}`;
  database = queries(getDatabase());
  const hash = await hashPassword("NotificationsFixture2026!");
  const createdAt = new Date().toISOString();
  await database.run(
    `INSERT INTO users(first_name,last_name,email,password_hash,role,created_at)
     VALUES ('First','User',?,?,'user',?),
            ('Second','User',?,?,'user',?),
            ('Notice','Admin',?,?,'admin',?);`,
    ["notifications-first@example.test", hash, createdAt,
      "notifications-second@example.test", hash, createdAt,
      "notifications-admin@example.test", hash, createdAt],
  );
  await database.run(
    `INSERT INTO notifications(user_id,type,title,message,created_at)
     VALUES (1,'booking_created','Prima','Messaggio 1','2026-10-01T10:00:00.000Z'),
            (1,'booking_created','Seconda','Messaggio 2','2026-10-02T10:00:00.000Z'),
            (1,'booking_created','Terza','Messaggio 3','2026-10-03T10:00:00.000Z'),
            (2,'booking_created','Altra','Messaggio 4','2026-10-04T10:00:00.000Z'),
            (3,'global_announcement','Admin','Messaggio 5','2026-10-05T10:00:00.000Z');`,
  );
  firstToken = await login("notifications-first@example.test");
  secondToken = await login("notifications-second@example.test");
  adminToken = await login("notifications-admin@example.test");
});

after(async () => {
  try {
    await closeTestServer(server);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("notifiche: ordine, mappatura e paginazione restano invariati", async () => {
  const first = await request("/?page=1&size=2");
  assert.equal(first.status, 200);
  assert.deepEqual(first.body.pagination, {
    page: 1,
    size: 2,
    totalElements: 3,
    totalPages: 2,
  });
  assert.deepEqual(first.body.data, [
    { id: 3, type: "booking_created", title: "Terza", message: "Messaggio 3",
      createdAt: "2026-10-03T10:00:00.000Z", readAt: null, read: false },
    { id: 2, type: "booking_created", title: "Seconda", message: "Messaggio 2",
      createdAt: "2026-10-02T10:00:00.000Z", readAt: null, read: false },
  ]);
  const second = await request("/?page=2&size=2");
  assert.equal(second.status, 200);
  assert.deepEqual(second.body.data.map((item) => item.id), [1]);
});

test("notifiche: paginazione non valida conserva errore e messaggio", async () => {
  for (const suffix of ["/?page=0", "/?size=101"]) {
    const result = await request(suffix);
    assert.equal(result.status, 400);
    assert.deepEqual(result.body, {
      error: {
        code: "VALIDATION_ERROR",
        message: "I parametri di paginazione non sono validi.",
      },
    });
  }
});

test("notifiche: lettura singola, ripetuta e ID errati", async () => {
  const marked = await request("/1/read", "PATCH");
  assert.equal(marked.status, 200);
  assert.deepEqual(marked.body, { data: { id: 1, read: true } });
  assert.equal((await request("/1/read", "PATCH")).status, 200);
  const listed = await request("/?page=3&size=1");
  assert.equal(listed.body.data[0].read, true);
  assert.match(listed.body.data[0].readAt, /^\d{4}-\d\d-\d\dT/);

  const invalid = await request("/nope/read", "PATCH");
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, "INVALID_NOTIFICATION_ID");
  const missing = await request("/999/read", "PATCH");
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error.code, "NOTIFICATION_NOT_FOUND");
  const otherUser = await request("/4/read", "PATCH");
  assert.equal(otherUser.status, 404);
  assert.equal(otherUser.body.error.code, "NOTIFICATION_NOT_FOUND");
});

test("notifiche: lettura globale modifica solo l'utente corrente", async () => {
  const result = await request("/read-all", "PATCH");
  assert.equal(result.status, 204);
  assert.equal(result.body, null);
  const first = await request("/");
  assert.equal(first.body.data.every((item) => item.read), true);
  const second = await request("/", "GET", secondToken);
  assert.equal(second.body.data[0].read, false);
  assert.equal(
    (await database.get("SELECT COUNT(*) AS count FROM notifications WHERE user_id = 2 AND read_at IS NOT NULL;")).count,
    0,
  );
});

test("notifiche: autenticazione e ruolo admin", async () => {
  assert.equal((await request("/", "GET", null)).status, 401);
  const admin = await request("/", "GET", adminToken);
  assert.equal(admin.status, 200);
  assert.deepEqual(admin.body.data.map((item) => item.id), [5]);
});
