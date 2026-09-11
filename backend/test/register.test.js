const assert = require("node:assert/strict");
require("node:test").beforeEach(() =>
  require("../middleware/rate-limit").resetRateLimits(),
);
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { before, after, test } = require("node:test");
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "slotlab-register-"));
process.env.SLOTLAB_DB_PATH = path.join(directory, "database.sqlite");
process.env.NODE_ENV = "test";
process.env.HOST = "127.0.0.1";
process.env.PORT = "0";
process.env.SLOTLAB_JWT_SECRET = crypto.randomBytes(32).toString("hex");
const { startServer, stopServer } = require("../server");
const { getDatabase } = require("../db/db");
const { verifyPassword } = require("../security/password");
let url;
const account = {
  firstName: " Mario ",
  lastName: " Rossi ",
  email: " MARIO@Example.test ",
  password: "TestPassword2026!",
};
before(async () => {
  const server = await startServer();
  url = `http://127.0.0.1:${server.address().port}/api/v1/auth/register`;
});
after(async () => {
  try {
    await stopServer();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
function get(sql, values = []) {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, values, (error, row) =>
      error ? reject(error) : resolve(row),
    );
  });
}
async function register(body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
}
test("registrazione pubblica: 201, dati normalizzati, hash verificabile e nessuna sessione", async () => {
  const { response, body } = await register(account);
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.deepEqual(Object.keys(body), ["data"]);
  assert.deepEqual(
    Object.keys(body.data).sort(),
    ["id", "firstName", "lastName", "email", "role", "createdAt"].sort(),
  );
  assert.equal(Number.isInteger(body.data.id), true);
  assert.ok(body.data.id > 0);
  assert.equal(body.data.firstName, "Mario");
  assert.equal(body.data.lastName, "Rossi");
  assert.equal(body.data.email, "mario@example.test");
  assert.equal(body.data.role, "user");
  assert.equal(
    new Date(body.data.createdAt).toISOString(),
    body.data.createdAt,
  );
  const row = await get("SELECT * FROM users WHERE id = ?;", [body.data.id]);
  assert.equal(row.role, "user");
  assert.equal(row.created_at, body.data.createdAt);
  assert.equal(row.email, body.data.email);
  assert.equal(await verifyPassword(account.password, row.password_hash), true);
  assert.equal(
    (await get("SELECT COUNT(*) AS count FROM auth_sessions;")).count,
    0,
  );
});
test("campi mancanti, tipi errati e nomi vuoti restituiscono 400 senza inserimenti", async () => {
  const beforeCount = await get("SELECT COUNT(*) AS count FROM users;");
  const bodies = [
    {},
    [],
    { ...account, firstName: " " },
    { ...account, lastName: "\t" },
  ];
  for (const field of ["firstName", "lastName", "email", "password"]) {
    const missing = { ...account };
    delete missing[field];
    bodies.push(
      missing,
      { ...account, [field]: null },
      { ...account, [field]: 42 },
    );
  }
  for (const input of bodies) {
    const { response, body } = await register(input);
    assert.equal(response.status, 400);
    assert.equal(body.error.code, "VALIDATION_ERROR");
  }
  assert.deepEqual(
    await get("SELECT COUNT(*) AS count FROM users;"),
    beforeCount,
  );
});
test("email e password non valide restituiscono i codici del contratto", async () => {
  const beforeCount = await get("SELECT COUNT(*) AS count FROM users;");
  const cases = [
    [{ email: "invalid" }, "INVALID_EMAIL"],
    [{ email: "" }, "INVALID_EMAIL"],
    [{ email: "u ser@example.test" }, "INVALID_EMAIL"],
    ...[
      "",
      "debole",
      "Aa1!aaa",
      "Aa1!" + "a".repeat(61),
      "Testpassword!",
      "testpassword1!",
      "TESTPASSWORD1!",
      "Testpassword1",
      " TestPassword2026!",
      "TestPassword2026!\n",
    ].map((password) => [
      { email: "invalid-password@example.test", password },
      "INVALID_PASSWORD_FORMAT",
    ]),
  ];
  for (const [changes, code] of cases) {
    const { response, body } = await register({ ...account, ...changes });
    assert.equal(response.status, 400);
    assert.equal(body.error.code, code);
    assert.deepEqual(Object.keys(body.error).sort(), ["code", "message"]);
  }
  assert.deepEqual(
    await get("SELECT COUNT(*) AS count FROM users;"),
    beforeCount,
  );
});
test("il campo role e sempre rifiutato, anche user o null", async () => {
  for (const role of ["admin", "user", null, false]) {
    const { response, body } = await register({
      ...account,
      email: "role@example.test",
      role,
    });
    assert.equal(response.status, 400);
    assert.equal(body.error.code, "VALIDATION_ERROR");
  }
  assert.equal(
    await get("SELECT id FROM users WHERE email = ?;", ["role@example.test"]),
    undefined,
  );
});
test("email duplicata normalizzata: 409 e account originale conservato", async () => {
  const original = await get("SELECT * FROM users WHERE email = ?;", [
    "mario@example.test",
  ]);
  const { response, body } = await register({
    ...account,
    email: "  MARIO@example.TEST  ",
    password: "DifferentPassword2026!",
  });
  assert.equal(response.status, 409);
  assert.equal(body.error.code, "EMAIL_ALREADY_EXISTS");
  assert.deepEqual(
    await get("SELECT * FROM users WHERE id = ?;", [original.id]),
    original,
  );
});
test("richieste contemporanee con stessa email: una creazione e un conflitto", async () => {
  const results = await Promise.all([
    register({ ...account, email: "race@example.test" }),
    register({ ...account, email: " RACE@Example.test " }),
  ]);
  assert.deepEqual(
    results.map((result) => result.response.status).sort(),
    [201, 409],
  );
  assert.equal(
    results.find((result) => result.response.status === 409).body.error.code,
    "EMAIL_ALREADY_EXISTS",
  );
  assert.equal(
    (
      await get("SELECT COUNT(*) AS count FROM users WHERE email = ?;", [
        "race@example.test",
      ])
    ).count,
    1,
  );
});
test("nomi con apostrofi e testo SQL sono salvati come dati", async () => {
  const firstName = "Mario'); DROP TABLE users; --";
  const { response, body } = await register({
    ...account,
    email: "quoted@example.test",
    firstName,
    lastName: "D'Amico",
  });
  assert.equal(response.status, 201);
  assert.equal(body.data.firstName, firstName);
  assert.equal(
    (await get("SELECT first_name FROM users WHERE id = ?;", [body.data.id]))
      .first_name,
    firstName,
  );
});
test("JSON malformato e corpo assente restituiscono errori uniformi", async () => {
  const malformed = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, "INVALID_JSON");
  const empty = await fetch(url, { method: "POST" });
  assert.equal(empty.status, 400);
  assert.equal((await empty.json()).error.code, "VALIDATION_ERROR");
});
test("errore database: 500 generico senza esporre o registrare dettagli riservati", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  t.mock.method(getDatabase(), "run", (sql, values, callback) => {
    callback(
      Object.assign(new Error("dettaglio database riservato"), {
        code: "SQLITE_ERROR",
      }),
    );
  });
  const { response, body } = await register({
    ...account,
    email: "failure@example.test",
  });
  assert.equal(response.status, 500);
  assert.deepEqual(body, {
    error: {
      code: "INTERNAL_ERROR",
      message: "Si e verificato un errore inatteso.",
    },
  });
  assert.equal(log.mock.callCount(), 1);
  assert.deepEqual(log.mock.calls[0].arguments, [
    "Errore interno durante la gestione di una richiesta.",
  ]);
  assert.equal(
    await get("SELECT id FROM users WHERE email = ?;", [
      "failure@example.test",
    ]),
    undefined,
  );
});
