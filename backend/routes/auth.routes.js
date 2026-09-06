const express = require('express');
const cookieParser = require('cookie-parser');
const { getDatabase } = require('../db/db');
const { hashPassword, verifyPassword } = require('../security/password');
const { normalizeAndValidateAccount, validateEmail } = require('../security/validation');
const { createSessionTokens, hashRefreshToken } = require('../security/tokens');
const { requireCookieRequest } = require('../middleware/cookie-request');
const { readConfig } = require('../config');

const router = express.Router();

// Hash fittizio nel formato previsto: esegue scrypt anche per email inesistenti.
// Non rappresenta un account e non puo consentire l'accesso.
const dummyPasswordHash = `scrypt$16384$8$1$${'0'.repeat(32)}$${'0'.repeat(128)}`;

function invalidCredentials() {
  return Object.assign(new Error('Email o password non corrette.'), {
    status: 401, code: 'INVALID_CREDENTIALS',
  });
}

router.post('/register', async (request, response) => {
  const body = request.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.hasOwn(body, 'role')) {
    throw Object.assign(new Error('Inviare i dati account senza il campo role.'), {
      status: 400, code: 'VALIDATION_ERROR',
    });
  }

  let account;
  try {
    account = normalizeAndValidateAccount(body);
  } catch (error) {
    if (['VALIDATION_ERROR', 'INVALID_EMAIL', 'INVALID_PASSWORD_FORMAT'].includes(error.code)) {
      error.status = 400;
    }
    throw error;
  }

  const passwordHash = await hashPassword(account.password);
  const createdAt = new Date().toISOString();
  const database = getDatabase();
  const id = await new Promise((resolve, reject) => {
    database.run(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, created_at)
       VALUES (?, ?, ?, ?, 'user', ?)
       ON CONFLICT(email) DO NOTHING;`,
      [account.firstName, account.lastName, account.email, passwordHash, createdAt],
      function onInsert(error) {
        if (error) {
          reject(error);
          return;
        }
        resolve(this.changes === 1 ? this.lastID : null);
      },
    );
  });

  // Il vincolo UNIQUE decide anche quando due richieste arrivano insieme.
  if (id === null) {
    throw Object.assign(new Error('Esiste gia un account con questa email.'), {
      status: 409, code: 'EMAIL_ALREADY_EXISTS',
    });
  }

  response.status(201).json({ data: {
    id,
    firstName: account.firstName,
    lastName: account.lastName,
    email: account.email,
    role: 'user',
    createdAt,
  } });
});

router.post('/login', async (request, response) => {
  response.set('Cache-Control', 'no-store');
  const body = request.body;
  if (!body || Array.isArray(body) || typeof body.password !== 'string') {
    throw invalidCredentials();
  }

  let email;
  try {
    email = validateEmail(body.email);
  } catch (error) {
    if (error.code === 'INVALID_EMAIL') throw invalidCredentials();
    throw error;
  }

  const database = getDatabase();
  const user = await new Promise((resolve, reject) => {
    database.get(
      'SELECT id, first_name, last_name, email, password_hash, role FROM users WHERE email = ?;',
      [email],
      (error, row) => error ? reject(error) : resolve(row),
    );
  });
  const matches = await verifyPassword(body.password, user ? user.password_hash : dummyPasswordHash);
  if (!user || !matches) throw invalidCredentials();

  const { auth } = readConfig();
  const tokens = createSessionTokens(user, auth);
  const changes = await new Promise((resolve, reject) => {
    database.run(
      `INSERT INTO auth_sessions
         (user_id, refresh_token_hash, access_token_jti, refresh_expires_at, created_at)
       SELECT id, ?, ?, ?, ? FROM users
       WHERE id = ? AND password_hash = ? AND role = ?
       ON CONFLICT(user_id) DO UPDATE SET
         refresh_token_hash = excluded.refresh_token_hash,
         access_token_jti = excluded.access_token_jti,
         refresh_expires_at = excluded.refresh_expires_at,
         created_at = excluded.created_at;`,
      [tokens.refreshTokenHash, tokens.jti, tokens.refreshExpiresAt, tokens.createdAt,
        user.id, user.password_hash, user.role],
      function onSession(error) {
        if (error) {
          reject(error);
          return;
        }
        resolve(this.changes);
      },
    );
  });
  // Se l'account e cambiato o e stato eliminato durante scrypt, non emettere token.
  if (changes !== 1) throw invalidCredentials();

  response.cookie(auth.refreshCookieName, tokens.refreshToken, auth.refreshCookie);
  response.status(200).json({ data: {
    accessToken: tokens.accessToken,
    tokenType: 'Bearer',
    expiresIn: auth.accessTokenSeconds,
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
    },
  } });
});

function refreshError(code) {
  return Object.assign(new Error('Sessione non rinnovabile. Effettua nuovamente il login.'), {
    status: 401, code,
  });
}

router.post('/refresh', requireCookieRequest, cookieParser(), async (request, response) => {
  const { auth } = readConfig();
  const refreshToken = request.cookies[auth.refreshCookieName];
  if (refreshToken === undefined) throw refreshError('REFRESH_TOKEN_MISSING');
  if (typeof refreshToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(refreshToken)) {
    throw refreshError('REFRESH_TOKEN_INVALID');
  }

  const oldHash = hashRefreshToken(refreshToken);
  const database = getDatabase();
  const session = await new Promise((resolve, reject) => {
    database.get(
      `SELECT u.id, u.role, s.id AS sessionId, s.access_token_jti AS jti,
              s.refresh_expires_at AS expiresAt
       FROM auth_sessions s JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = ?;`,
      [oldHash],
      (error, row) => error ? reject(error) : resolve(row),
    );
  });
  // Senza uno storico dei vecchi hash non si distingue un token sostituito da uno sconosciuto.
  if (!session) throw refreshError('REFRESH_TOKEN_INVALID');
  const expiresAt = Date.parse(session.expiresAt);
  if (!Number.isFinite(expiresAt)) throw refreshError('REFRESH_TOKEN_INVALID');
  if (expiresAt <= Date.now()) throw refreshError('REFRESH_TOKEN_EXPIRED');

  const tokens = createSessionTokens(session, auth);
  const now = new Date().toISOString();
  const changes = await new Promise((resolve, reject) => {
    database.run(
      `UPDATE auth_sessions
       SET refresh_token_hash = ?, access_token_jti = ?, refresh_expires_at = ?
       WHERE id = ? AND refresh_token_hash = ? AND access_token_jti = ?
         AND refresh_expires_at > ?
         AND EXISTS (SELECT 1 FROM users WHERE id = auth_sessions.user_id AND role = ?);`,
      [tokens.refreshTokenHash, tokens.jti, tokens.refreshExpiresAt,
        session.sessionId, oldHash, session.jti, now, session.role],
      function onRotate(error) {
        if (error) {
          reject(error);
          return;
        }
        resolve(this.changes);
      },
    );
  });
  if (changes !== 1) {
    throw refreshError(expiresAt <= Date.parse(now) ? 'REFRESH_TOKEN_EXPIRED' : 'SESSION_REPLACED');
  }

  response.cookie(auth.refreshCookieName, tokens.refreshToken, auth.refreshCookie);
  response.json({ data: {
    accessToken: tokens.accessToken,
    tokenType: 'Bearer',
    expiresIn: auth.accessTokenSeconds,
  } });
});

router.post('/logout', requireCookieRequest, cookieParser(), async (request, response) => {
  const { auth } = readConfig();
  const refreshToken = request.cookies[auth.refreshCookieName];
  let changes = 0;
  if (typeof refreshToken === 'string' && /^[A-Za-z0-9_-]{43}$/.test(refreshToken)) {
    changes = await new Promise((resolve, reject) => {
      getDatabase().run(
        'DELETE FROM auth_sessions WHERE refresh_token_hash = ?;',
        [hashRefreshToken(refreshToken)],
        function onLogout(error) {
          if (error) {
            reject(error);
            return;
          }
          resolve(this.changes);
        },
      );
    });
  }

  // Una richiesta vecchia non deve cancellare il cookie di una sessione piu recente.
  if (changes === 1) {
    const { maxAge, ...cookieOptions } = auth.refreshCookie;
    response.clearCookie(auth.refreshCookieName, cookieOptions);
  }
  response.status(204).end();
});

module.exports = router;
