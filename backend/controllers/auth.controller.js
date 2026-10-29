const { hashPassword, verifyPassword } = require("../security/password");
const {
  normalizeAndValidateAccount,
  validateEmail,
} = require("../security/validation");
const { createSessionTokens, hashRefreshToken } = require("../security/tokens");
const { readConfig } = require("../config");
const { requestRecovery } = require("../security/recovery");
const { clearSessionCookie } = require("../security/account-password");
const {
  createUser,
  findUserForLogin,
  saveLoginSession,
  findRefreshSession,
  rotateRefreshSession,
  removeRefreshSession,
} = require("../models/auth.model");

const dummyPasswordHash = `scrypt$16384$8$1$${"0".repeat(32)}$${"0".repeat(128)}`;

function invalidCredentials() {
  return Object.assign(new Error("Email o password non corrette."), {
    status: 401,
    code: "INVALID_CREDENTIALS",
  });
}

async function register(request, response) {
  const body = request.body;
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.hasOwn(body, "role")
  ) {
    throw Object.assign(
      new Error("Inviare i dati account senza il campo role."),
      { status: 400, code: "VALIDATION_ERROR" },
    );
  }
  let account;
  try {
    account = normalizeAndValidateAccount(body);
  } catch (error) {
    if (
      ["VALIDATION_ERROR", "INVALID_EMAIL", "INVALID_PASSWORD_FORMAT"].includes(
        error.code,
      )
    ) {
      error.status = 400;
    }
    throw error;
  }
  const passwordHash = await hashPassword(account.password);
  const createdAt = new Date().toISOString();
  const { changes, lastId } = await createUser(account, passwordHash, createdAt);
  if (changes !== 1) {
    throw Object.assign(new Error("Esiste gia un account con questa email."), {
      status: 409,
      code: "EMAIL_ALREADY_EXISTS",
    });
  }
  response.status(201).json({
    data: {
      id: lastId,
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      role: "user",
      createdAt,
    },
  });
}

async function login(request, response) {
  const body = request.body;
  if (!body || Array.isArray(body) || typeof body.password !== "string") {
    throw invalidCredentials();
  }
  let email;
  try {
    email = validateEmail(body.email);
  } catch (error) {
    if (error.code === "INVALID_EMAIL") throw invalidCredentials();
    throw error;
  }
  const user = await findUserForLogin(email);
  const matches = await verifyPassword(
    body.password,
    user ? user.password_hash : dummyPasswordHash,
  );
  if (!user || !matches) throw invalidCredentials();
  const { auth } = readConfig();
  const tokens = createSessionTokens(user, auth);
  const { changes } = await saveLoginSession(user, tokens);
  if (changes !== 1) throw invalidCredentials();
  response.cookie(
    auth.refreshCookieName,
    tokens.refreshToken,
    auth.refreshCookie,
  );
  response.status(200).json({
    data: {
      accessToken: tokens.accessToken,
      tokenType: "Bearer",
      expiresIn: auth.accessTokenSeconds,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
      },
    },
  });
}

function refreshError(code) {
  return Object.assign(
    new Error("Sessione non rinnovabile. Effettua nuovamente il login."),
    { status: 401, code },
  );
}

async function refresh(request, response) {
  const { auth } = readConfig();
  const refreshToken = request.cookies[auth.refreshCookieName];
  if (refreshToken === undefined) throw refreshError("REFRESH_TOKEN_MISSING");
  if (
    typeof refreshToken !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(refreshToken)
  ) {
    throw refreshError("REFRESH_TOKEN_INVALID");
  }
  const oldHash = hashRefreshToken(refreshToken);
  const session = await findRefreshSession(oldHash);
  if (!session) throw refreshError("REFRESH_TOKEN_INVALID");
  const expiresAt = Date.parse(session.expiresAt);
  if (!Number.isFinite(expiresAt)) throw refreshError("REFRESH_TOKEN_INVALID");
  if (expiresAt <= Date.now()) throw refreshError("REFRESH_TOKEN_EXPIRED");
  const tokens = createSessionTokens(session, auth);
  const now = new Date().toISOString();
  const { changes } = await rotateRefreshSession(session, oldHash, tokens, now);
  if (changes !== 1) {
    throw refreshError(
      expiresAt <= Date.parse(now)
        ? "REFRESH_TOKEN_EXPIRED"
        : "SESSION_REPLACED",
    );
  }
  response.cookie(
    auth.refreshCookieName,
    tokens.refreshToken,
    auth.refreshCookie,
  );
  response.json({
    data: {
      accessToken: tokens.accessToken,
      tokenType: "Bearer",
      expiresIn: auth.accessTokenSeconds,
    },
  });
}

async function logout(request, response) {
  const { auth } = readConfig();
  const refreshToken = request.cookies[auth.refreshCookieName];
  let changes = 0;
  if (
    typeof refreshToken === "string" &&
    /^[A-Za-z0-9_-]{43}$/.test(refreshToken)
  ) {
    ({ changes } = await removeRefreshSession(hashRefreshToken(refreshToken)));
  }
  if (changes === 1) {
    const { maxAge, ...cookieOptions } = auth.refreshCookie;
    response.clearCookie(auth.refreshCookieName, cookieOptions);
  }
  response.status(204).end();
}

function forgotPassword(request, response) {
  let email;
  try {
    email = validateEmail(request.body?.email);
  } catch (error) {
    error.status = 400;
    throw error;
  }
  if (!requestRecovery(email)) {
    return response.status(429).json({
      error: { code: "RATE_LIMIT_EXCEEDED", message: "Riprova più tardi." },
    });
  }
  clearSessionCookie(response);
  response.status(204).end();
}

module.exports = { register, login, refresh, logout, forgotPassword };
