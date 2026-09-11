const { queries, transaction } = require("../db/transaction");
const { getDatabase } = require("../db/db");
const { verifyPassword, hashPassword } = require("./password");
const { validatePassword } = require("./validation");
const { readConfig } = require("../config");
function accountError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}
async function checkPassword(request) {
  const password = request.body?.currentPassword;
  if (typeof password !== "string")
    throw accountError(
      400,
      "VALIDATION_ERROR",
      "Inserisci la password corrente.",
    );
  const user = await queries(getDatabase()).get(
    "SELECT * FROM users WHERE id = ?",
    [request.user.id],
  );
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw accountError(
      400,
      "CURRENT_PASSWORD_INVALID",
      "La password corrente non è corretta.",
    );
  }
  return user;
}
async function assertCurrent(query, request, user) {
  const current = await query.get(
    `SELECT u.id FROM users u JOIN auth_sessions s ON s.user_id = u.id
    WHERE u.id = ? AND u.password_hash = ? AND u.role = ? AND s.access_token_jti = ?`,
    [user.id, user.password_hash, request.user.role, request.authJti],
  );
  if (!current)
    throw accountError(
      401,
      "UNAUTHORIZED",
      "La sessione non è più valida. Accedi nuovamente.",
    );
}
function clearSessionCookie(response) {
  const { auth } = readConfig();
  const { maxAge, ...options } = auth.refreshCookie;
  response.clearCookie(auth.refreshCookieName, options);
}
async function changePassword(request, response) {
  try {
    validatePassword(request.body?.newPassword);
  } catch (e) {
    e.status = 400;
    throw e;
  }
  const user = await checkPassword(request);
  const hash = await hashPassword(request.body.newPassword);
  await transaction(async (query) => {
    await assertCurrent(query, request, user);
    await query.run("UPDATE users SET password_hash = ? WHERE id = ?", [
      hash,
      user.id,
    ]);
    await query.run("DELETE FROM auth_sessions WHERE user_id = ?", [user.id]);
  });
  clearSessionCookie(response);
  response.status(204).end();
}
module.exports = {
  accountError,
  checkPassword,
  assertCurrent,
  clearSessionCookie,
  changePassword,
};
