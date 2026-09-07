const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { changePassword } = require('../security/account-password');
const { deleteAccount } = require('../security/delete-account');
const { rateLimit } = require('../middleware/rate-limit');
const accountLimit = rateLimit({ limit: 10, windowMs: 15 * 60000, key: request => request.user.id });

const router = express.Router();

router.get('/me', requireAuth, requireRole('user', 'admin'), (request, response) => {
  response.json({ data: request.user });
});

router.patch('/me/password', requireAuth, requireRole('user', 'admin'), accountLimit, changePassword);
router.delete('/me', requireAuth, requireRole('user'), accountLimit, deleteAccount);
module.exports = router;
