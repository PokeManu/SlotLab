const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/me', requireAuth, requireRole('user', 'admin'), (request, response) => {
  response.json({ data: request.user });
});

module.exports = router;
