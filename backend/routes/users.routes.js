const express = require('express');
const { getDatabase } = require('../db/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { changePassword } = require('../security/account-password');
const { deleteAccount } = require('../security/delete-account');
const { rateLimit } = require('../middleware/rate-limit');
const { readProfilePhoto } = require('../security/profile-photo');
const accountLimit = rateLimit({ limit: 10, windowMs: 15 * 60000, key: request => request.user.id });

const router = express.Router();

router.get('/me', requireAuth, requireRole('user', 'admin'), (request, response) => {
  response.json({ data: request.user });
});

router.get('/me/photo', requireAuth, requireRole('user', 'admin'), async (request, response) => {
  const row = await new Promise((resolve, reject) => getDatabase().get(
    'SELECT profile_photo AS photo, profile_photo_type AS type FROM users WHERE id = ?;',
    [request.user.id],
    (error, result) => error ? reject(error) : resolve(result),
  ));
  if (!row?.photo || !row.type) {
    throw Object.assign(new Error('Foto profilo non disponibile.'), {
      status: 404, code: 'PROFILE_PHOTO_NOT_FOUND',
    });
  }
  response.set('Cache-Control', 'private, no-store');
  response.type(row.type).send(row.photo);
});

router.put('/me/photo', requireAuth, requireRole('user', 'admin'), accountLimit, async (request, response) => {
  const photo = await readProfilePhoto(request);
  await new Promise((resolve, reject) => getDatabase().run(
    'UPDATE users SET profile_photo = ?, profile_photo_type = ? WHERE id = ?;',
    [photo.data, photo.type, request.user.id],
    error => error ? reject(error) : resolve(),
  ));
  response.status(204).end();
});

router.delete('/me/photo', requireAuth, requireRole('user', 'admin'), accountLimit, async (request, response) => {
  await new Promise((resolve, reject) => getDatabase().run(
    'UPDATE users SET profile_photo = NULL, profile_photo_type = NULL WHERE id = ?;',
    [request.user.id],
    error => error ? reject(error) : resolve(),
  ));
  response.status(204).end();
});

router.patch('/me/password', requireAuth, requireRole('user', 'admin'), accountLimit, changePassword);
router.delete('/me', requireAuth, requireRole('user'), accountLimit, deleteAccount);
module.exports = router;
