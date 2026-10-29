const { verifyPassword } = require("./password");
const { readConfig } = require("../config");
const {
  findAccountForPasswordCheck,
  findCurrentSessionUser,
} = require("../models/users.model");
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
  const user = await findAccountForPasswordCheck(request.user.id);
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
  const current = await findCurrentSessionUser(
    query,
    user,
    request.user.role,
    request.authJti,
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
module.exports = {
  accountError,
  checkPassword,
  assertCurrent,
  clearSessionCookie,
};
