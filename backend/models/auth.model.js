const { getDatabase } = require("../db/db");
const { queries } = require("../db/query");

function createUser(account, passwordHash, createdAt) {
  return queries(getDatabase()).run(
    `INSERT INTO users (first_name, last_name, email, password_hash, role, created_at)
     VALUES (?, ?, ?, ?, 'user', ?)
     ON CONFLICT(email) DO NOTHING;`,
    [
      account.firstName,
      account.lastName,
      account.email,
      passwordHash,
      createdAt,
    ],
  );
}

function findUserForLogin(email) {
  return queries(getDatabase()).get(
    "SELECT id, first_name, last_name, email, password_hash, role FROM users WHERE email = ?;",
    [email],
  );
}

function saveLoginSession(user, tokens) {
  return queries(getDatabase()).run(
    `INSERT INTO auth_sessions
       (user_id, refresh_token_hash, access_token_jti, refresh_expires_at, created_at)
     SELECT id, ?, ?, ?, ? FROM users
     WHERE id = ? AND password_hash = ? AND role = ?
     ON CONFLICT(user_id) DO UPDATE SET
       refresh_token_hash = excluded.refresh_token_hash,
       access_token_jti = excluded.access_token_jti,
       refresh_expires_at = excluded.refresh_expires_at,
       created_at = excluded.created_at;`,
    [
      tokens.refreshTokenHash,
      tokens.jti,
      tokens.refreshExpiresAt,
      tokens.createdAt,
      user.id,
      user.password_hash,
      user.role,
    ],
  );
}

function findRefreshSession(refreshTokenHash) {
  return queries(getDatabase()).get(
    `SELECT u.id, u.role, s.id AS sessionId, s.access_token_jti AS jti,
            s.refresh_expires_at AS expiresAt
     FROM auth_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.refresh_token_hash = ?;`,
    [refreshTokenHash],
  );
}

function rotateRefreshSession(session, oldHash, tokens, now) {
  return queries(getDatabase()).run(
    `UPDATE auth_sessions
     SET refresh_token_hash = ?, access_token_jti = ?, refresh_expires_at = ?
     WHERE id = ? AND refresh_token_hash = ? AND access_token_jti = ?
       AND refresh_expires_at > ?
       AND EXISTS (SELECT 1 FROM users WHERE id = auth_sessions.user_id AND role = ?);`,
    [
      tokens.refreshTokenHash,
      tokens.jti,
      tokens.refreshExpiresAt,
      session.sessionId,
      oldHash,
      session.jti,
      now,
      session.role,
    ],
  );
}

function removeRefreshSession(refreshTokenHash) {
  return queries(getDatabase()).run(
    "DELETE FROM auth_sessions WHERE refresh_token_hash = ?;",
    [refreshTokenHash],
  );
}

function findAuthenticatedUser(userId, role, jti) {
  return queries(getDatabase()).get(
    `SELECT u.id, u.first_name AS firstName, u.last_name AS lastName,
            u.email, u.role, u.created_at AS createdAt
     FROM users u JOIN auth_sessions s ON s.user_id = u.id
     WHERE u.id = ? AND u.role = ? AND s.access_token_jti = ?;`,
    [userId, role, jti],
  );
}

function findRecoveryUser(email) {
  return queries(getDatabase()).get(
    "SELECT id, password_hash FROM users WHERE email = ?",
    [email],
  );
}

function findUnchangedRecoveryUser(query, user) {
  return query.get(
    "SELECT id FROM users WHERE id = ? AND password_hash = ?",
    [user.id, user.password_hash],
  );
}

async function saveRecoveredPassword(query, userId, passwordHash) {
  await query.run("UPDATE users SET password_hash = ? WHERE id = ?", [
    passwordHash,
    userId,
  ]);
  await query.run("DELETE FROM auth_sessions WHERE user_id = ?", [userId]);
}

module.exports = {
  createUser,
  findUserForLogin,
  saveLoginSession,
  findRefreshSession,
  rotateRefreshSession,
  removeRefreshSession,
  findAuthenticatedUser,
  findRecoveryUser,
  findUnchangedRecoveryUser,
  saveRecoveredPassword,
};
