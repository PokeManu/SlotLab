const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { before, after, test } = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "slotlab-auth-"));
process.env.SLOTLAB_DB_PATH = path.join(directory, "database.sqlite");
process.env.NODE_ENV = "test";
process.env.HOST = "127.0.0.1";
process.env.PORT = "0";
process.env.SLOTLAB_JWT_SECRET = crypto.randomBytes(32).toString("hex");
const { startServer, stopServer } = require("../server");
const { getDatabase } = require("../db/db");
const { seed } = require("../db/seed");
const { requireAuth, requireRole } = require("../middleware/auth");
const errorHandler = require("../middleware/error-handler");
const key = Buffer.from(process.env.SLOTLAB_JWT_SECRET, "hex");
const account = {
  firstName: "Auth",
  lastName: "Test",
  email: "auth@example.test",
  password: "AuthPassword2026!",
};
let baseUrl;
let roleServer;
let roleUrl;
async function post(endpoint, input) {
  const response = await fetch(`${baseUrl}/api/v1/auth/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  assert.ok(response.ok);
  return (await response.json()).data;
}
function run(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, parameters, function onRun(error) {
      error ? reject(error) : resolve(this.lastID);
    });
  });
}
function get(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, parameters, (error, row) =>
      error ? reject(error) : resolve(row),
    );
  });
}
async function me(token, suffix = "", extraHeaders = {}) {
  const response = await fetch(`${baseUrl}/api/v1/users/me${suffix}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
  });
  return { response, body: await response.json() };
}
function sign(claims, options = {}) {
  return jwt.sign(claims, key, {
    algorithm: "HS256",
    noTimestamp: !Object.hasOwn(claims, "iat"),
    ...options,
  });
}
before(async () => {
  const server = await startServer();
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  await post("register", account);
  await seed({
    admin: { ...account, email: "auth-admin@example.test" },
    databasePath: process.env.SLOTLAB_DB_PATH,
  });
  const roleApp = express();
  roleApp.get("/admin", requireAuth, requireRole("admin"), (req, res) =>
    res.sendStatus(204),
  );
  roleApp.get("/user", requireAuth, requireRole("user"), (req, res) =>
    res.sendStatus(204),
  );
  roleApp.use(errorHandler);
  roleServer = await new Promise((resolve, reject) => {
    const server = roleApp.listen(0, "127.0.0.1", () => resolve(server));
    server.once("error", reject);
  });
  roleUrl = `http://127.0.0.1:${roleServer.address().port}`;
});
after(async () => {
  try {
    if (roleServer)
      await new Promise((resolve, reject) => {
        roleServer.close((error) => (error ? reject(error) : resolve()));
      });
    await stopServer();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
test("users/me restituisce solo i dati pubblici correnti di user e admin", async () => {
  for (const [email, role] of [
    [account.email, "user"],
    ["auth-admin@example.test", "admin"],
  ]) {
    const login = await post("login", { ...account, email });
    const { response, body } = await me(
      login.accessToken,
      "?id=999&role=admin",
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(body, {
      data: { ...login.user, createdAt: body.data.createdAt },
    });
    assert.equal(body.data.role, role);
    assert.equal(
      new Date(body.data.createdAt).toISOString(),
      body.data.createdAt,
    );
    assert.equal(response.headers.get("set-cookie"), null);
  }
});
test("Bearer assente o malformato e token in query/cookie non autorizzano", async () => {
  const login = await post("login", account);
  for (const header of [
    undefined,
    "Basic abc",
    "Bearer",
    "Bearer abc def",
    "Bearer malformed",
  ]) {
    const { response, body } = await me(
      undefined,
      "",
      header ? { Authorization: header } : {},
    );
    assert.equal(response.status, 401);
    assert.equal(body.error.code, "UNAUTHORIZED");
  }
  const result = await me(undefined, `?accessToken=${login.accessToken}`, {
    Cookie: `slotlab_refresh=${login.accessToken}`,
  });
  assert.equal(result.response.status, 401);
  assert.equal(
    (await me(undefined, "", { Authorization: `bearer ${login.accessToken}` }))
      .response.status,
    200,
  );
});
test("token scaduto, firma errata, algoritmo diverso e token senza firma: 401", async () => {
  const login = await post("login", account);
  const claims = jwt.verify(login.accessToken, key);
  const now = Math.floor(Date.now() / 1000);
  const tokens = [
    sign({ ...claims, iat: now - 1800, exp: now }),
    jwt.sign(claims, crypto.randomBytes(32), { algorithm: "HS256" }),
    sign(claims, { algorithm: "HS384" }),
    jwt.sign(claims, null, { algorithm: "none" }),
  ];
  for (const token of tokens) {
    const { response, body } = await me(token);
    assert.equal(response.status, 401);
    assert.equal(body.error.code, "UNAUTHORIZED");
  }
});
test("claim mancanti, extra o incoerenti sono rifiutati anche con firma valida", async () => {
  const login = await post("login", account);
  const claims = jwt.verify(login.accessToken, key);
  const variants = [
    { ...claims, sub: 1 },
    { ...claims, sub: "01" },
    { ...claims, sub: "0" },
    { ...claims, sub: "9007199254740992" },
    { ...claims, role: "teacher" },
    { ...claims, role: "admin" },
    { ...claims, jti: "" },
    { ...claims, jti: "other-session" },
    { ...claims, exp: claims.exp + 1 },
    { ...claims, extra: true },
    { ...claims, iat: claims.iat + 3600, exp: claims.exp + 3600 },
  ];
  for (const field of ["sub", "role", "iat", "exp", "jti"]) {
    const missing = { ...claims };
    delete missing[field];
    variants.push(missing);
  }
  for (const variant of variants) {
    assert.equal((await me(sign(variant))).response.status, 401);
  }
});
test("nuovo login: vecchio JWT ancora firmato ma subito rifiutato da users/me", async () => {
  const first = await post("login", account);
  assert.equal((await me(first.accessToken)).response.status, 200);
  const second = await post("login", account);
  assert.ok(jwt.verify(first.accessToken, key));
  assert.equal((await me(first.accessToken)).response.status, 401);
  assert.equal((await me(second.accessToken)).response.status, 200);
});
test("sessione eliminata: JWT non scaduto rifiutato", async () => {
  const login = await post("login", account);
  await run("DELETE FROM auth_sessions WHERE user_id = ?;", [login.user.id]);
  assert.equal((await me(login.accessToken)).response.status, 401);
});
test("account eliminato: JWT non scaduto rifiutato", async () => {
  const input = { ...account, email: "delete-auth@example.test" };
  await post("register", input);
  const login = await post("login", input);
  await run("DELETE FROM users WHERE id = ?;", [login.user.id]);
  assert.equal((await me(login.accessToken)).response.status, 401);
});
test("controlli ruolo HTTP: user e admin separati, 403 distinto da 401", async () => {
  const user = await post("login", account);
  const admin = await post("login", {
    ...account,
    email: "auth-admin@example.test",
  });
  for (const [login, allowed, denied] of [
    [user, "/user", "/admin"],
    [admin, "/admin", "/user"],
  ]) {
    const headers = { Authorization: `Bearer ${login.accessToken}` };
    assert.equal((await fetch(roleUrl + allowed, { headers })).status, 204);
    const response = await fetch(roleUrl + denied, { headers });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, "FORBIDDEN");
  }
  assert.equal((await fetch(roleUrl + "/admin")).status, 401);
});
test("errore DB nelle API protette resta un 500 generico", async (t) => {
  const login = await post("login", account);
  const log = t.mock.method(console, "error", () => {});
  t.mock.method(getDatabase(), "get", (sql, values, callback) => {
    callback(
      Object.assign(new Error("dettaglio riservato"), { code: "SQLITE_ERROR" }),
    );
  });
  const { response, body } = await me(login.accessToken);
  assert.equal(response.status, 500);
  assert.deepEqual(body, {
    error: {
      code: "INTERNAL_ERROR",
      message: "Si e verificato un errore inatteso.",
    },
  });
  assert.deepEqual(log.mock.calls[0].arguments, [
    "Errore interno durante la gestione di una richiesta.",
  ]);
});
test("router reali: admin accede a spazi/edifici, user e anonimo sono rifiutati", async () => {
  const admin = await post("login", {
    ...account,
    email: "auth-admin@example.test",
  });
  const user = await post("login", account);
  for (const endpoint of [
    "/admin/summary",
    "/admin/spaces",
    "/admin/buildings",
  ]) {
    for (const [token, expected] of [
      [admin.accessToken, 200],
      [user.accessToken, 403],
      [null, 401],
    ]) {
      const response = await fetch(`${baseUrl}/api/v1${endpoint}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      assert.equal(response.status, expected, endpoint);
    }
  }
  const catalog = await fetch(`${baseUrl}/api/v1/spaces`, {
    headers: { Authorization: `Bearer ${admin.accessToken}` },
  });
  assert.equal(catalog.status, 403);
});
test("catalogo spazi senza edificio restituisce gli spazi seedati", async () => {
  const login = await post("login", account);
  const response = await fetch(`${baseUrl}/api/v1/spaces`, {
    headers: { Authorization: `Bearer ${login.accessToken}` },
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(body.pagination.totalElements, 3);
  assert.deepEqual(
    body.data.map((space) => space.name),
    ["Aula Studio A1", "Laboratorio Reti", "Sala Riunioni B"],
  );
});
test("admin puo risolvere direttamente una segnalazione aperta", async () => {
  const buildingId = await run(
    "INSERT INTO buildings (number, name, address, latitude, longitude) VALUES (?, ?, ?, ?, ?);",
    [901, "Edificio test segnalazioni", "Via test 1", 38.1, 13.3],
  );
  const spaceId = await run(
    `INSERT INTO spaces (building_id, name, floor, type, capacity, accessible, status)
     VALUES (?, 'Spazio test segnalazioni', 1, 'study_room', 10, 1, 'active');`,
    [buildingId],
  );
  const user = await post("login", account);
  const reportId = await run(
    `INSERT INTO reports (user_id, space_id, category, description, priority, status, created_at, updated_at)
     VALUES (?, ?, 'technical', 'Segnalazione di test', 'high', 'open', ?, ?);`,
    [user.user.id, spaceId, new Date().toISOString(), new Date().toISOString()],
  );
  const admin = await post("login", {
    ...account,
    email: "auth-admin@example.test",
  });
  const response = await fetch(
    `${baseUrl}/api/v1/admin/reports/${reportId}/status`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${admin.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "resolved" }),
    },
  );
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, {
    id: reportId,
    status: "resolved",
  });
  assert.equal(
    (await get("SELECT status FROM reports WHERE id = ?;", [reportId])).status,
    "resolved",
  );
});
test("foto segnalazione: solo admin, contenuto e file mancante", async () => {
  const root = path.join(directory, "photos");
  fs.mkdirSync(root);
  process.env.SLOTLAB_UPLOAD_DIR = root;
  const filename = "test-photo.png";
  const data = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5WQAAAAASUVORK5CYII=",
    "base64",
  );
  fs.writeFileSync(path.join(root, filename), data);
  const user = await post("login", account);
  const admin = await post("login", {
    ...account,
    email: "auth-admin@example.test",
  });
  const space = await get("SELECT id FROM spaces LIMIT 1");
  const now = new Date().toISOString();
  const reportId = await run(
    "INSERT INTO reports(user_id,space_id,category,description,priority,status,photo_path,created_at,updated_at) VALUES(?,?,'other','Foto test','low','open',?,?,?)",
    [user.user.id, space.id, filename, now, now],
  );
  const url = `${baseUrl}/api/v1/admin/reports/${reportId}/photo`;
  try {
    assert.equal((await fetch(url)).status, 401);
    assert.equal(
      (
        await fetch(url, {
          headers: { Authorization: `Bearer ${user.accessToken}` },
        })
      ).status,
      403,
    );
    const headers = { Authorization: `Bearer ${admin.accessToken}` };
    const response = await fetch(url, { headers });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/png");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), data);
    const userUrl = `${baseUrl}/api/v1/reports/${reportId}/photo`;
    assert.equal((await fetch(userUrl)).status, 401);
    const own = await fetch(userUrl, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    assert.equal(own.status, 200);
    assert.deepEqual(Buffer.from(await own.arrayBuffer()), data);
    const form = new FormData();
    form.append("category", "other");
    form.append("description", "Fotografia salvata nel database di test.");
    form.append("photo", new Blob([data], { type: "image/png" }), "test.png");
    const created = await fetch(
      `${baseUrl}/api/v1/spaces/${space.id}/reports`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${user.accessToken}` },
        body: form,
      },
    );
    assert.equal(created.status, 201);
    const databaseReport = (await created.json()).data;
    assert.equal(databaseReport.photo, "available");
    const stored = await get(
      "SELECT photo_path AS photoPath, photo_data AS photoData, photo_type AS photoType FROM reports WHERE id=?",
      [databaseReport.id],
    );
    assert.equal(stored.photoPath, null);
    assert.equal(stored.photoType, "image/png");
    assert.deepEqual(stored.photoData, data);
    const databasePhoto = await fetch(
      `${baseUrl}/api/v1/reports/${databaseReport.id}/photo`,
      { headers: { Authorization: `Bearer ${user.accessToken}` } },
    );
    assert.equal(databasePhoto.status, 200);
    assert.equal(databasePhoto.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await databasePhoto.arrayBuffer()), data);
    const otherAccount = { ...account, email: "photo-other@example.test" };
    await post("register", otherAccount);
    const other = await post("login", otherAccount);
    assert.equal(
      (
        await fetch(userUrl, {
          headers: { Authorization: `Bearer ${other.accessToken}` },
        })
      ).status,
      404,
    );
    fs.unlinkSync(path.join(root, filename));
    assert.equal((await fetch(url, { headers })).status, 404);
    await run("UPDATE reports SET photo_path = ? WHERE id = ?", [
      "../secret.png",
      reportId,
    ]);
    assert.equal((await fetch(url, { headers })).status, 500);
  } finally {
    delete process.env.SLOTLAB_UPLOAD_DIR;
  }
});
test("avvisi globali: autorizzazione, destinatari e rollback atomico", async () => {
  const admin = await post("login", {
    ...account,
    email: "auth-admin@example.test",
  });
  const user = await post("login", account);
  const publish = (
    token,
    body = { title: " Avviso test ", message: " Messaggio test " },
  ) =>
    fetch(`${baseUrl}/api/v1/admin/announcements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  assert.equal((await publish(null)).status, 401);
  assert.equal((await publish(user.accessToken)).status, 403);
  assert.equal(
    (
      await publish(admin.accessToken, {
        title: "Troppo lungo",
        message: "x".repeat(1001),
      })
    ).status,
    400,
  );
  const search = await fetch(
    `${baseUrl}/api/v1/admin/users?search=%20Auth%20%20Test%20`,
    {
      headers: { Authorization: `Bearer ${admin.accessToken}` },
    },
  );
  assert.equal(search.status, 200);
  assert.ok(
    (await search.json()).data.some((found) => found.email === account.email),
  );
  for (const body of [
    {},
    { title: " ", message: "test" },
    { title: "test", message: 2 },
    { title: "test", message: "test", userId: 1 },
  ]) {
    assert.equal((await publish(admin.accessToken, body)).status, 400);
  }
  const recipients = (
    await get("SELECT COUNT(*) AS count FROM users WHERE role = 'user'")
  ).count;
  const response = await publish(admin.accessToken);
  assert.equal(response.status, 201);
  const { data } = await response.json();
  assert.equal(data.recipientCount, recipients);
  assert.equal(data.title, "Avviso test");
  assert.equal(data.message, "Messaggio test");
  assert.equal(
    (await get("SELECT author_id FROM announcements WHERE id = ?", [data.id]))
      .author_id,
    admin.user.id,
  );
  assert.equal(
    (
      await get(
        "SELECT COUNT(*) AS count FROM notifications WHERE announcement_id = ?",
        [data.id],
      )
    ).count,
    recipients,
  );
  assert.equal(
    (
      await get(
        "SELECT COUNT(*) AS count FROM notifications n JOIN users u ON u.id=n.user_id WHERE n.announcement_id=? AND u.role='admin'",
        [data.id],
      )
    ).count,
    0,
  );
  const notification = await get(
    "SELECT title, message, type, read_at FROM notifications WHERE announcement_id=? AND user_id=?",
    [data.id, user.user.id],
  );
  assert.deepEqual(notification, {
    title: data.title,
    message: data.message,
    type: "global_announcement",
    read_at: null,
  });
  const newcomer = await post("register", {
    ...account,
    email: "announcement-new@example.test",
  });
  assert.equal(
    (
      await get("SELECT COUNT(*) AS count FROM notifications WHERE user_id=?", [
        newcomer.id,
      ])
    ).count,
    0,
  );
  const before = (await get("SELECT COUNT(*) AS count FROM announcements"))
    .count;
  await run(
    "CREATE TRIGGER fail_announcement BEFORE INSERT ON notifications WHEN NEW.type='global_announcement' BEGIN SELECT RAISE(ABORT, 'test failure'); END",
  );
  try {
    assert.equal((await publish(admin.accessToken)).status, 500);
    assert.equal(
      (await get("SELECT COUNT(*) AS count FROM announcements")).count,
      before,
    );
    assert.equal(
      (
        await get(
          "SELECT COUNT(*) AS count FROM notifications WHERE type='global_announcement'",
        )
      ).count,
      recipients,
    );
  } finally {
    await run("DROP TRIGGER fail_announcement");
  }
});
test("fasce ritirate e ricreate: il catalogo restituisce i nuovi ID prenotabili", async () => {
  const admin = await post("login", {
    ...account,
    email: "auth-admin@example.test",
  });
  const user = await post("login", account);
  const building = await get("SELECT id FROM buildings LIMIT 1");
  const spaceId = await run(
    "INSERT INTO spaces(building_id,name,floor,type,capacity,accessible,status) VALUES(?,'Test ricrea fasce',1,'study_room',24,1,'active')",
    [building.id],
  );
  const day = new Date(Date.now() + 7 * 86400000);
  const date = day.toISOString().slice(0, 10);
  const input = {
    validFrom: date,
    validUntil: date,
    weekday: day.getUTCDay() || 7,
    startTime: "08:00",
    endTime: "10:00",
  };
  const adminUrl = `${baseUrl}/api/v1/admin/spaces/${spaceId}/availability`;
  const headers = {
    Authorization: `Bearer ${admin.accessToken}`,
    "Content-Type": "application/json",
  };
  const create = async (body) => {
    const response = await fetch(adminUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 201);
    return (await response.json()).data.availabilityId;
  };
  const oldId = await create(input);
  assert.equal(
    (await fetch(`${adminUrl}/${oldId}`, { method: "DELETE", headers })).status,
    204,
  );
  const newId = await create({
    ...input,
    startTime: "14:00",
    endTime: "16:00",
  });
  assert.notEqual(newId, oldId);
  const response = await fetch(
    `${baseUrl}/api/v1/spaces/${spaceId}/availability?date=${date}`,
    { headers: { Authorization: `Bearer ${user.accessToken}` } },
  );
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.equal(data.length, 1);
  assert.equal(data[0].availabilityId, newId);
  assert.equal(data[0].startTime, "14:00");
  assert.equal(data[0].bookable, true);
});
test("prenotazioni admin: elenco reale con organizzatore e paginazione", async () => {
  const admin = await post("login", {
    ...account,
    email: "auth-admin@example.test",
  });
  const user = await post("login", account);
  const headers = { Authorization: `Bearer ${admin.accessToken}` };
  const slot = await get("SELECT id,space_id FROM availabilities LIMIT 1");
  const bookingId = await run(
    "INSERT INTO bookings(space_id,availability_id,date,status,created_at) VALUES(?,?,'2026-09-14','confirmed',?)",
    [slot.space_id, slot.id, new Date().toISOString()],
  );
  await run(
    "INSERT INTO booking_participants(booking_id,user_id,participant_role) VALUES(?,?,'organizer')",
    [bookingId, user.user.id],
  );
  const url = `${baseUrl}/api/v1/admin/bookings`;
  assert.equal((await fetch(url)).status, 401);
  assert.equal(
    (
      await fetch(url, {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      })
    ).status,
    403,
  );
  const response = await fetch(`${url}?page=1&size=100`, { headers });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(
    body.pagination.totalElements,
    (await get("SELECT COUNT(*) AS count FROM bookings")).count,
  );
  const booking = body.data.find((row) => row.id === bookingId);
  assert.equal(booking.organizerName, "Auth Test");
  assert.equal(booking.participantCount, 1);
  assert.equal(booking.status, "confirmed");
  const empty = await fetch(`${url}?page=999&size=100`, { headers });
  assert.deepEqual((await empty.json()).data, []);
});
test("check-in sceglie la fascia corrente anche con prenotazioni precedenti", async () => {
  const user = await post("login", account);
  const admin = await post("login", {
    ...account,
    email: "auth-admin@example.test",
  });
  const building = await get("SELECT id FROM buildings LIMIT 1");
  const spaceId = await run(
    "INSERT INTO spaces(building_id,name,floor,type,capacity,accessible,status) VALUES(?,'Test check-in multiplo',1,'study_room',24,1,'active')",
    [building.id],
  );
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const minute = Math.max(
    0,
    Number(parts.hour) * 60 + Number(parts.minute) - 2,
  );
  const start = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  const slot = await run(
    "INSERT INTO availabilities(space_id,valid_from,valid_until,weekday,start_time,end_time,is_retired) VALUES(?,'2000-01-01','2099-12-31',1,?,'23:59',0)",
    [spaceId, start],
  );
  const insert = async (dateValue) => {
    const id = await run(
      "INSERT INTO bookings(space_id,availability_id,date,status,created_at) VALUES(?,?,?,'confirmed',?)",
      [spaceId, slot, dateValue, new Date().toISOString()],
    );
    await run(
      "INSERT INTO booking_participants(booking_id,user_id,participant_role) VALUES(?,?,'organizer')",
      [id, user.user.id],
    );
    return id;
  };
  const previous = await insert("2000-01-01");
  const current = await insert(date);
  const url = `${baseUrl}/api/v1/spaces/${spaceId}/check-in`;
  const verify = (token) =>
    fetch(url, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  assert.equal((await verify(null)).status, 401);
  assert.equal((await verify(admin.accessToken)).status, 403);
  const response = await verify(user.accessToken);
  assert.equal(response.status, 200);
  const first = (await response.json()).data;
  assert.equal(first.bookingId, current);
  assert.equal(first.result, "check_in_accepted");
  assert.equal(
    (
      await get("SELECT present FROM booking_participants WHERE booking_id=?", [
        previous,
      ])
    ).present,
    0,
  );
  await run(
    "UPDATE booking_participants SET present=1,checked_in_at=? WHERE booking_id=?",
    ["2000-01-01T08:00:00.000Z", previous],
  );
  const repeated = (await (await verify(user.accessToken)).json()).data;
  assert.equal(repeated.bookingId, current);
  assert.equal(repeated.result, "already_checked_in");
  assert.equal(repeated.checkedInAt, first.checkedInAt);
  await run(
    "UPDATE booking_participants SET present=0,checked_in_at=NULL WHERE booking_id=?",
    [current],
  );
  const concurrent = await Promise.all([
    verify(user.accessToken),
    verify(user.accessToken),
  ]);
  assert.deepEqual(
    concurrent.map((item) => item.status),
    [200, 200],
  );
  const concurrentResults = await Promise.all(
    concurrent.map((item) => item.json()),
  );
  assert.deepEqual(concurrentResults.map((item) => item.data.result).sort(), [
    "already_checked_in",
    "check_in_accepted",
  ]);
  assert.equal(
    concurrentResults[0].data.checkedInAt,
    concurrentResults[1].data.checkedInAt,
  );
  const storedCheckIn = await get(
    "SELECT COUNT(*) AS count,MIN(checked_in_at) AS first,MAX(checked_in_at) AS last FROM booking_participants WHERE booking_id=? AND user_id=?",
    [current, user.user.id],
  );
  assert.equal(storedCheckIn.count, 1);
  assert.equal(storedCheckIn.first, storedCheckIn.last);
  const wrongSpaceId = await run(
    "INSERT INTO spaces(building_id,name,floor,type,capacity,accessible,status) VALUES(?,'QR spazio errato',1,'study_room',24,1,'active')",
    [building.id],
  );
  const wrongSpace = await fetch(
    `${baseUrl}/api/v1/spaces/${wrongSpaceId}/check-in`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${user.accessToken}` },
    },
  );
  assert.equal(wrongSpace.status, 404);
  assert.equal((await wrongSpace.json()).error.code, "NO_BOOKING_FOR_SPACE");
  assert.equal(
    (
      await get(
        "SELECT present FROM booking_participants WHERE booking_id=? AND user_id=?",
        [current, user.user.id],
      )
    ).present,
    1,
  );
  const other = { ...account, email: "check-in-other@example.test" };
  await post("register", other);
  const stranger = await post("login", other);
  assert.equal((await verify(stranger.accessToken)).status, 404);
  await run(
    "UPDATE booking_participants SET present=0,checked_in_at=NULL WHERE booking_id=?",
    [previous],
  );
  await run("DELETE FROM bookings WHERE id=?", [current]);
  const expired = await verify(user.accessToken);
  assert.equal(expired.status, 409);
  assert.equal((await expired.json()).error.code, "CHECK_IN_EXPIRED");
  await insert("2099-12-01");
  const early = await verify(user.accessToken);
  assert.equal(early.status, 409);
  assert.equal((await early.json()).error.code, "CHECK_IN_TOO_EARLY");
});
test("prenotazioni: capienza condivisa con fasce ritirate, idempotenza e notifiche", async () => {
  require("../middleware/rate-limit").resetRateLimits();
  const accounts = [];
  for (let i = 0; i < 3; i++) {
    const credentials = { ...account, email: `capacity-${i}@example.test` };
    await post("register", credentials);
    accounts.push(await post("login", credentials));
  }
  const building = await get("SELECT id FROM buildings LIMIT 1");
  const spaceId = await run(
    "INSERT INTO spaces(building_id,name,floor,type,capacity,accessible,status) VALUES(?,'Capienza test',1,'study_room',2,1,'active')",
    [building.id],
  );
  const day = new Date(Date.now() + 7 * 86400000),
    date = day.toISOString().slice(0, 10);
  const weekday = day.getUTCDay() || 7;
  const makeSlot = (retired) =>
    run(
      "INSERT INTO availabilities(space_id,valid_from,valid_until,weekday,start_time,end_time,is_retired) VALUES(?,?,?,?,?,?,?)",
      [spaceId, date, date, weekday, "10:00", "12:00", retired],
    );
  const oldSlot = await makeSlot(1),
    newSlot = await makeSlot(0);
  const oldBooking = await run(
    "INSERT INTO bookings(space_id,availability_id,date,status,created_at) VALUES(?,?,?,'confirmed',?)",
    [spaceId, oldSlot, date, new Date().toISOString()],
  );
  await run(
    "INSERT INTO booking_participants(booking_id,user_id,participant_role) VALUES(?,?,'organizer')",
    [oldBooking, accounts[0].user.id],
  );
  const headers = (index) => ({
    Authorization: `Bearer ${accounts[index].accessToken}`,
    "Content-Type": "application/json",
  });
  const body = {
    spaceId,
    availabilityId: newSlot,
    date,
    participantEmails: [],
  };
  const create = (index, key) =>
    fetch(`${baseUrl}/api/v1/bookings`, {
      method: "POST",
      headers: { ...headers(index), "Idempotency-Key": key },
      body: JSON.stringify(body),
    });
  const availability = await fetch(
    `${baseUrl}/api/v1/spaces/${spaceId}/availability?date=${date}`,
    { headers: headers(1) },
  );
  assert.equal((await availability.json()).data[0].availableSeats, 1);
  const responses = await Promise.all([
    create(1, "capacity-one"),
    create(2, "capacity-two"),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
  const winner = responses[0].status === 201 ? 1 : 2,
    loser = winner === 1 ? 2 : 1;
  const created = (await responses[winner - 1].json()).data;
  assert.equal(
    (await responses[loser - 1].json()).error.code,
    "INSUFFICIENT_CAPACITY",
  );
  const repeat = await create(
    winner,
    winner === 1 ? "capacity-one" : "capacity-two",
  );
  assert.equal(repeat.status, 200);
  assert.equal((await repeat.json()).data.id, created.id);
  assert.equal(
    (
      await get(
        "SELECT COUNT(*) AS count FROM notifications WHERE user_id=? AND type='booking_created'",
        [accounts[winner].user.id],
      )
    ).count,
    1,
  );
  const addition = await fetch(
    `${baseUrl}/api/v1/bookings/${created.id}/participants`,
    {
      method: "POST",
      headers: headers(winner),
      body: JSON.stringify({ email: `capacity-${loser}@example.test` }),
    },
  );
  assert.equal(addition.status, 409);
  assert.equal((await addition.json()).error.code, "INSUFFICIENT_CAPACITY");
  const removed = await fetch(`${baseUrl}/api/v1/bookings/${created.id}`, {
    method: "DELETE",
    headers: headers(winner),
  });
  assert.equal(removed.status, 204);
  assert.equal(
    (await create(winner, winner === 1 ? "capacity-one" : "capacity-two"))
      .status,
    409,
  );
});
test("admin: modifica spazio e servizi, cancellazione con foto e notifiche mirate", async () => {
  require("../middleware/rate-limit").resetRateLimits();
  const admin = await post("login", {
    ...account,
    email: "auth-admin@example.test",
  });
  const user = await post("login", account);
  const headers = {
    Authorization: `Bearer ${admin.accessToken}`,
    "Content-Type": "application/json",
  };
  const request = async (method, url, body) =>
    fetch(`${baseUrl}/api/v1/admin${url}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  const building = await get("SELECT id FROM buildings LIMIT 1");
  const created = await request("POST", "/spaces", {
    buildingId: building.id,
    name: "Spazio eliminabile",
    floor: 1,
    type: "study_room",
    capacity: 10,
    accessible: true,
    status: "active",
    serviceCodes: ["wifi"],
  });
  assert.equal(created.status, 201);
  const id = (await created.json()).data.id;
  const newBuilding = await run(
    "INSERT INTO buildings(number,name,address,latitude,longitude) VALUES(998,'Edificio modifica','Via test',38,13)",
  );
  assert.equal(
    (
      await request("PATCH", `/spaces/${id}`, {
        buildingId: newBuilding,
        serviceCodes: ["computer", "projector"],
      })
    ).status,
    200,
  );
  const detail = (await (await request("GET", `/spaces/${id}`)).json()).data;
  assert.equal(detail.building.id, newBuilding);
  assert.deepEqual(detail.serviceCodes, ["computer", "projector"]);
  const photoRoot = path.join(directory, "delete-photos");
  fs.mkdirSync(photoRoot);
  process.env.SLOTLAB_UPLOAD_DIR = photoRoot;
  fs.writeFileSync(path.join(photoRoot, "delete-test.png"), "test");
  const now = new Date().toISOString();
  await run(
    "INSERT INTO reports(user_id,space_id,category,description,priority,status,photo_path,created_at,updated_at) VALUES(?,?,'other','Test eliminazione','low','open','delete-test.png',?,?)",
    [user.user.id, id, now, now],
  );
  const slot = await run(
    "INSERT INTO availabilities(space_id,valid_from,valid_until,weekday,start_time,end_time,is_retired) VALUES(?,'2026-01-01','2099-12-31',1,'10:00','12:00',0)",
    [id],
  );
  const booking = await run(
    "INSERT INTO bookings(space_id,availability_id,date,status,created_at) VALUES(?,?,'2099-12-01','confirmed',?)",
    [id, slot, now],
  );
  await run(
    "INSERT INTO booking_participants(booking_id,user_id,participant_role) VALUES(?,?,'organizer')",
    [booking, user.user.id],
  );
  const before = (
    await get(
      "SELECT COUNT(*) AS count FROM notifications WHERE user_id=? AND type='space_unavailable'",
      [user.user.id],
    )
  ).count;
  try {
    assert.equal((await request("DELETE", `/spaces/${id}`)).status, 204);
    assert.equal(fs.existsSync(path.join(photoRoot, "delete-test.png")), false);
    assert.equal(
      (
        await get("SELECT COUNT(*) AS count FROM bookings WHERE id=?", [
          booking,
        ])
      ).count,
      0,
    );
    assert.equal(
      (
        await get(
          "SELECT COUNT(*) AS count FROM notifications WHERE user_id=? AND type='space_unavailable'",
          [user.user.id],
        )
      ).count,
      before + 1,
    );
  } finally {
    delete process.env.SLOTLAB_UPLOAD_DIR;
  }
});
