const { readProfilePhoto } = require("../security/profile-photo");
const { hashPassword } = require("../security/password");
const { validatePassword } = require("../security/validation");
const {
  checkPassword,
  assertCurrent,
  clearSessionCookie,
} = require("../security/account-password");
const { transaction } = require("../db/transaction");
const { removeAccount } = require("../security/delete-account");
const {
  findProfilePhoto,
  saveProfilePhoto,
  removeProfilePhoto,
  replacePasswordAndRevokeSessions,
} = require("../models/users.model");

function getCurrentUser(request, response) {
  response.json({ data: request.user });
}

async function getProfilePhoto(request, response) {
  const row = await findProfilePhoto(request.user.id);
  if (!row?.photo || !row.type) {
    throw Object.assign(new Error("Foto profilo non disponibile."), {
      status: 404,
      code: "PROFILE_PHOTO_NOT_FOUND",
    });
  }
  response.set("Cache-Control", "private, no-store");
  response.type(row.type).send(row.photo);
}

async function putProfilePhoto(request, response) {
  const photo = await readProfilePhoto(request);
  await saveProfilePhoto(request.user.id, photo);
  response.status(204).end();
}

async function deleteProfilePhoto(request, response) {
  await removeProfilePhoto(request.user.id);
  response.status(204).end();
}

async function changePassword(request, response) {
  try {
    validatePassword(request.body?.newPassword);
  } catch (error) {
    error.status = 400;
    throw error;
  }
  const user = await checkPassword(request);
  const hash = await hashPassword(request.body.newPassword);
  await transaction(async (query) => {
    await assertCurrent(query, request, user);
    await replacePasswordAndRevokeSessions(query, user.id, hash);
  });
  clearSessionCookie(response);
  response.status(204).end();
}

async function deleteAccount(request, response) {
  await removeAccount(request);
  clearSessionCookie(response);
  response.status(204).end();
}

module.exports = {
  getCurrentUser,
  getProfilePhoto,
  putProfilePhoto,
  deleteProfilePhoto,
  changePassword,
  deleteAccount,
};
