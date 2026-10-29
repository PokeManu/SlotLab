const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { before, after, test } = require("node:test");

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "slotlab-reports-"));
process.env.SLOTLAB_DB_PATH = path.join(directory, "reports.sqlite");
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
let firstToken;
let secondToken;
let adminToken;
let server;
let photoReportId;
const photo = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

async function login(email) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "ReportsFixture2026!" }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).data.accessToken;
}

function headers(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function createReport(description, withPhoto = false) {
  const form = new FormData();
  form.set("category", "technical");
  form.set("description", description);
  if (withPhoto)
    form.set("photo", new Blob([photo], { type: "image/png" }), "test.png");
  const response = await fetch(`${base}/api/v1/spaces/1/reports`, {
    method: "POST",
    headers: headers(firstToken),
    body: form,
  });
  assert.equal(response.status, 201);
  return (await response.json()).data;
}

before(async () => {
  server = await startServer();
  base = `http://127.0.0.1:${server.address().port}`;
  const db = queries(getDatabase());
  const hash = await hashPassword("ReportsFixture2026!");
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO users(first_name,last_name,email,password_hash,role,created_at)
     VALUES ('First','User',?,?,'user',?),
            ('Second','User',?,?,'user',?),
            ('Report','Admin',?,?,'admin',?);`,
    ["reports-first@example.test", hash, now,
      "reports-second@example.test", hash, now,
      "reports-admin@example.test", hash, now],
  );
  await db.run(
    "INSERT INTO buildings(number,name,address,latitude,longitude) VALUES(94,'Report building','Test',38,13);",
  );
  await db.run(
    "INSERT INTO spaces(building_id,name,floor,type,capacity,accessible,status) VALUES(1,'Report room',0,'study_room',10,1,'active');",
  );
  firstToken = await login("reports-first@example.test");
  secondToken = await login("reports-second@example.test");
  adminToken = await login("reports-admin@example.test");
});

after(async () => {
  try {
    await closeTestServer(server);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("segnalazioni: creazione e lista paginata restano accessibili al proprietario", async () => {
  const empty = await fetch(`${base}/api/v1/reports`, { headers: headers(firstToken) });
  assert.equal(empty.status, 200);
  assert.deepEqual((await empty.json()).pagination, {
    page: 1, size: 20, totalElements: 0, totalPages: 0,
  });
  const created = await createReport("Presa guasta");
  assert.equal(created.spaceName, "Report room");
  assert.equal(created.photo, null);
  assert.equal(created.priority, "high");

  const listed = await fetch(`${base}/api/v1/reports?page=1&size=1`, {
    headers: headers(firstToken),
  });
  assert.equal(listed.status, 200);
  const body = await listed.json();
  assert.equal(body.pagination.totalElements, 1);
  assert.equal(body.data[0].id, created.id);
  assert.equal(body.data[0].description, "Presa guasta");

  const other = await fetch(`${base}/api/v1/reports`, { headers: headers(secondToken) });
  assert.deepEqual((await other.json()).data, []);
});

test("segnalazioni: foto BLOB conserva contenuto e autorizzazione", async () => {
  const created = await createReport("Presa con foto", true);
  photoReportId = created.id;
  assert.equal(created.photo, "available");
  const url = `${base}/api/v1/reports/${photoReportId}/photo`;
  const own = await fetch(url, { headers: headers(firstToken) });
  assert.equal(own.status, 200);
  assert.equal(own.headers.get("content-type"), "image/png");
  assert.deepEqual(Buffer.from(await own.arrayBuffer()), photo);
  const other = await fetch(url, { headers: headers(secondToken) });
  assert.equal(other.status, 404);
  assert.equal((await other.json()).error.code, "PHOTO_NOT_FOUND");
});

test("segnalazioni: autenticazione e ruolo restano obbligatori", async () => {
  const anonymous = await fetch(`${base}/api/v1/reports`);
  assert.equal(anonymous.status, 401);
  const admin = await fetch(`${base}/api/v1/reports`, { headers: headers(adminToken) });
  assert.equal(admin.status, 403);
});

test("segnalazioni: multipart controllato e dettaglio rimosso", async () => {
  const notMultipart = await fetch(`${base}/api/v1/spaces/1/reports`, {
    method: "POST",
    headers: { ...headers(firstToken), "Content-Type": "application/json" },
    body: JSON.stringify({ category: "technical", description: "Formato errato" }),
  });
  assert.equal(notMultipart.status, 415);
  assert.equal((await notMultipart.json()).error.code, "UNSUPPORTED_MEDIA_TYPE");

  const malformedMultipart = await fetch(`${base}/api/v1/spaces/1/reports`, {
    method: "POST",
    headers: { ...headers(firstToken), "Content-Type": "multipart/form-data" },
    body: "category=technical",
  });
  assert.equal(malformedMultipart.status, 415);
  assert.equal((await malformedMultipart.json()).error.code, "UNSUPPORTED_MEDIA_TYPE");

  const invalidPhoto = new FormData();
  invalidPhoto.set("category", "technical");
  invalidPhoto.set("description", "Foto non valida");
  invalidPhoto.set(
    "photo",
    new Blob([Buffer.from("not-an-image")], { type: "image/png" }),
    "invalid.png",
  );
  const invalid = await fetch(`${base}/api/v1/spaces/1/reports`, {
    method: "POST",
    headers: headers(firstToken),
    body: invalidPhoto,
  });
  assert.equal(invalid.status, 415);
  assert.equal((await invalid.json()).error.code, "INVALID_PHOTO_FORMAT");

  const tooLarge = new FormData();
  tooLarge.set("category", "technical");
  tooLarge.set("description", "Foto troppo grande");
  tooLarge.set(
    "photo",
    new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], { type: "image/png" }),
    "large.png",
  );
  const large = await fetch(`${base}/api/v1/spaces/1/reports`, {
    method: "POST",
    headers: headers(firstToken),
    body: tooLarge,
  });
  assert.equal(large.status, 413);
  assert.equal((await large.json()).error.code, "PHOTO_TOO_LARGE");

  const tooManyFields = new FormData();
  tooManyFields.set("category", "technical");
  tooManyFields.set("description", "Troppi campi");
  tooManyFields.set("unexpected", "campo non previsto");
  const fieldsLimit = await fetch(`${base}/api/v1/spaces/1/reports`, {
    method: "POST",
    headers: headers(firstToken),
    body: tooManyFields,
  });
  assert.equal(fieldsLimit.status, 413);
  assert.equal((await fieldsLimit.json()).error.code, "PHOTO_TOO_LARGE");

  const tooLargeField = new FormData();
  tooLargeField.set("category", "technical");
  tooLargeField.set("description", "x".repeat(64 * 1024 + 1));
  const fieldSizeLimit = await fetch(`${base}/api/v1/spaces/1/reports`, {
    method: "POST",
    headers: headers(firstToken),
    body: tooLargeField,
  });
  assert.equal(fieldSizeLimit.status, 413);
  assert.equal((await fieldSizeLimit.json()).error.code, "PHOTO_TOO_LARGE");

  const detail = await fetch(`${base}/api/v1/reports/${photoReportId}`, {
    headers: headers(firstToken),
  });
  assert.equal(detail.status, 404);
  assert.equal((await detail.json()).error.code, "ROUTE_NOT_FOUND");
});
