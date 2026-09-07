const express = require('express');
const { getDatabase } = require('../db/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('user', 'admin'));

function query(sql, values = []) {
  return new Promise((resolve, reject) => getDatabase().all(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));
}

function run(sql, values = []) {
  return new Promise((resolve, reject) => getDatabase().run(sql, values, function onRun(error) {
    error ? reject(error) : resolve({ changes: this.changes });
  }));
}

function notificationId(value) {
  if (!/^[1-9][0-9]*$/.test(String(value))) throw Object.assign(new Error('Identificativo notifica non valido.'), { status: 400, code: 'INVALID_NOTIFICATION_ID' });
  return Number(value);
}

function mapNotification(row) {
  return { id: row.id, type: row.type, title: row.title, message: row.message,
    createdAt: row.createdAt, readAt: row.readAt, read: row.readAt !== null };
}

router.get('/', async (request, response) => {
  const page = request.query.page === undefined ? 1 : Number(request.query.page);
  const size = request.query.size === undefined ? 20 : Number(request.query.size);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(size) || size < 1 || size > 100) {
    throw Object.assign(new Error('I parametri di paginazione non sono validi.'), { status: 400, code: 'VALIDATION_ERROR' });
  }
  const rows = await query(
    `SELECT id, type, title, message, created_at AS createdAt, read_at AS readAt
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?;`,
    [request.user.id, size, (page - 1) * size],
  );
  const total = await new Promise((resolve, reject) => getDatabase().get('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?;', [request.user.id], (error, row) => error ? reject(error) : resolve(row.count)));
  response.json({ data: rows.map(mapNotification), pagination: { page, size, totalElements: total, totalPages: Math.ceil(total / size) } });
});

router.patch('/read-all', async (request, response) => {
  await run('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL;', [new Date().toISOString(), request.user.id]);
  response.status(204).end();
});

router.patch('/:notificationId/read', async (request, response) => {
  const id = notificationId(request.params.notificationId);
  const existing = await new Promise((resolve, reject) => getDatabase().get('SELECT id, read_at AS readAt FROM notifications WHERE id = ? AND user_id = ?;', [id, request.user.id], (error, row) => error ? reject(error) : resolve(row)));
  if (!existing) throw Object.assign(new Error('La notifica richiesta non esiste.'), { status: 404, code: 'NOTIFICATION_NOT_FOUND' });
  if (existing.readAt === null) await run('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL;', [new Date().toISOString(), id, request.user.id]);
  response.json({ data: { id, read: true } });
});

module.exports = router;
