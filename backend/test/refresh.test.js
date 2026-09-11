const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { before, after, test } = require("node:test");
const jwt = require("jsonwebtoken");
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "slotlab-refresh-"));
process.env.SLOTLAB_DB_PATH = path.join(directory, "database.sqlite");
process.env.NODE_ENV = "test";
process.env.HOST = "127.0.0.1";
process.env.PORT = "0";
process.env.SLOTLAB_JWT_SECRET = crypto.randomBytes(32).toString("hex");
const { startServer, stopServer } = require("../server");
const { getDatabase } = require("../db/db");
const { hashRefreshToken } = require("../security/tokens");
const key = Buffer.from(process.env.SLOTLAB_JWT_SECRET, "hex");
const account = {
  firstName: "Refresh",
  lastName: "Test",
  email: "refresh@example.test",
  password: "RefreshPassword2026!",
};
let baseUrl;
async function post(endpoint, body, headers = {}) {
  const response = await fetch(`${baseUrl}/api/v1/auth/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
}
function cookie(result) {
  return result.response.headers.get("set-cookie").split(";")[0];
}
function refresh(value, headers = {}) {
  return post(
    "refresh",
    {},
    {
      "X-SlotLab-Request": "1",
      ...(value ? { Cookie: value } : {}),
      ...headers,
    },
  );
}
function getSession() {
  return new Promise((resolve, reject) => {
    getDatabase().get(
      "SELECT * FROM auth_sessions LIMIT 1;",
      [],
      (error, row) => (error ? reject(error) : resolve(row)),
    );
  });
}
function run(sql, values = []) {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, values, (error) =>
      error ? reject(error) : resolve(),
    );
  });
}
async function me(token) {
  return fetch(`${baseUrl}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
before(async () => {
  const server = await startServer();
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await post("register", account)).response.status, 201);
});
after(async () => {
  try {
    await stopServer();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
test("refresh senza Bearer: ruota cookie e jti, revoca vecchio access e conserva data login", async () => {
  const login = await post("login", account);
  const previous = await getSession();
  const result = await refresh(cookie(login));
  assert.equal(result.response.status, 200);
  assert.equal(result.response.headers.get("cache-control"), "no-store");
  assert.deepEqual(
    Object.keys(result.body.data).sort(),
    ["accessToken", "tokenType", "expiresIn"].sort(),
  );
  assert.equal(result.body.data.expiresIn, 1800);
  assert.equal(result.body.data.tokenType, "Bearer");
  assert.notEqual(cookie(result), cookie(login));
  const claims = jwt.verify(result.body.data.accessToken, key, {
    algorithms: ["HS256"],
  });
  const session = await getSession();
  assert.equal(session.access_token_jti, claims.jti);
  assert.equal(
    session.refresh_token_hash,
    hashRefreshToken(cookie(result).split("=")[1]),
  );
  assert.equal(session.created_at, previous.created_at);
  assert.ok(
    Math.abs(Date.parse(session.refresh_expires_at) - Date.now() - 604800000) <
      2000,
  );
  for (const attribute of [
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/api/v1/auth",
    "Max-Age=604800",
  ]) {
    assert.ok(
      result.response.headers.get("set-cookie").split("; ").includes(attribute),
    );
  }
  assert.equal((await me(login.body.data.accessToken)).status, 401);
  assert.equal((await me(result.body.data.accessToken)).status, 200);
  const replay = await refresh(cookie(login));
  assert.equal(replay.response.status, 401);
  assert.equal(replay.body.error.code, "REFRESH_TOKEN_INVALID");
  assert.equal(replay.response.headers.get("set-cookie"), null);
  assert.deepEqual(await getSession(), session);
  assert.equal((await refresh(cookie(result))).response.status, 200);
});
test("cookie mancante, malformato e sconosciuto: errori distinti, nessuna rotazione", async () => {
  await post("login", account);
  const previous = await getSession();
  for (const [value, code] of [
    [undefined, "REFRESH_TOKEN_MISSING"],
    ["slotlab_refresh=", "REFRESH_TOKEN_INVALID"],
    ["slotlab_refresh=%ZZ", "REFRESH_TOKEN_INVALID"],
    ["slotlab_refresh=j:null", "REFRESH_TOKEN_INVALID"],
    [
      `slotlab_refresh=${crypto.randomBytes(32).toString("base64url")}`,
      "REFRESH_TOKEN_INVALID",
    ],
  ]) {
    const result = await refresh(value);
    assert.equal(result.response.status, 401);
    assert.equal(result.body.error.code, code);
    assert.equal(result.response.headers.get("set-cookie"), null);
  }
  assert.deepEqual(await getSession(), previous);
});
test("refresh scaduto: 401 REFRESH_TOKEN_EXPIRED senza alterare la sessione", async () => {
  const login = await post("login", account);
  await run("UPDATE auth_sessions SET refresh_expires_at = ?;", [
    new Date(Date.now() - 1000).toISOString(),
  ]);
  const previous = await getSession();
  const result = await refresh(cookie(login));
  assert.equal(result.response.status, 401);
  assert.equal(result.body.error.code, "REFRESH_TOKEN_EXPIRED");
  assert.equal(result.response.headers.get("set-cookie"), null);
  assert.deepEqual(await getSession(), previous);
});
test("header di protezione obbligatorio e richieste cross-site rifiutate", async () => {
  const login = await post("login", account);
  const previous = await getSession();
  for (const headers of [
    { Cookie: cookie(login) },
    {
      Cookie: cookie(login),
      "X-SlotLab-Request": "1",
      "Sec-Fetch-Site": "cross-site",
    },
  ]) {
    const result = await post("refresh", {}, headers);
    assert.equal(result.response.status, 403);
    assert.equal(result.body.error.code, "FORBIDDEN");
    assert.equal(result.response.headers.get("set-cookie"), null);
  }
  const preflight = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://outside.example",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "x-slotlab-request",
    },
  });
  assert.equal(preflight.headers.get("access-control-allow-origin"), null);
  assert.deepEqual(await getSession(), previous);
});
test("due refresh letti insieme: una sola rotazione e SESSION_REPLACED per il secondo", async (t) => {
  const login = await post("login", account);
  const database = getDatabase();
  const originalGet = database.get.bind(database);
  const waiting = [];
  t.mock.method(database, "get", (sql, values, callback) => {
    if (!sql.includes("WHERE s.refresh_token_hash"))
      return originalGet(sql, values, callback);
    return originalGet(sql, values, (error, row) => {
      waiting.push(() => callback(error, row));
      if (waiting.length === 2) waiting.forEach((deliver) => deliver());
    });
  });
  const results = await Promise.all([
    refresh(cookie(login)),
    refresh(cookie(login)),
  ]);
  assert.deepEqual(
    results.map((result) => result.response.status).sort(),
    [200, 401],
  );
  const winner = results.find((result) => result.response.status === 200);
  const loser = results.find((result) => result.response.status === 401);
  assert.equal(loser.body.error.code, "SESSION_REPLACED");
  assert.equal(loser.response.headers.get("set-cookie"), null);
  assert.equal(
    (await getSession()).refresh_token_hash,
    hashRefreshToken(cookie(winner).split("=")[1]),
  );
  assert.equal((await me(winner.body.data.accessToken)).status, 200);
});
test("nuovo login rende inutilizzabile il refresh precedente", async () => {
  const first = await post("login", account);
  const second = await post("login", account);
  const previous = await getSession();
  assert.equal(
    (await refresh(cookie(first))).body.error.code,
    "REFRESH_TOKEN_INVALID",
  );
  assert.deepEqual(await getSession(), previous);
  assert.equal((await refresh(cookie(second))).response.status, 200);
});
test("errore DB durante rotazione conserva la coppia corrente e non emette cookie", async (t) => {
  const login = await post("login", account);
  const previous = await getSession();
  t.mock.method(console, "error", () => {});
  t.mock.method(getDatabase(), "run", (sql, values, callback) =>
    callback(new Error("errore riservato")),
  );
  const result = await refresh(cookie(login));
  assert.equal(result.response.status, 500);
  assert.equal(result.body.error.code, "INTERNAL_ERROR");
  assert.equal(result.response.headers.get("set-cookie"), null);
  assert.deepEqual(await getSession(), previous);
});
