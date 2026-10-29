async function listForUser(database, userId, page, size) {
  const rows = await database.all(
    `SELECT id, type, title, message, created_at AS createdAt, read_at AS readAt
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?;`,
    [userId, size, (page - 1) * size],
  );
  const count = await database.get(
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?;",
    [userId],
  );
  return { rows, total: count.count };
}

function markAllRead(database, userId, readAt) {
  return database.run(
    "UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL;",
    [readAt, userId],
  );
}

function findForUser(database, id, userId) {
  return database.get(
    "SELECT id, read_at AS readAt FROM notifications WHERE id = ? AND user_id = ?;",
    [id, userId],
  );
}

function markRead(database, id, userId, readAt) {
  return database.run(
    "UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL;",
    [readAt, id, userId],
  );
}

module.exports = { findForUser, listForUser, markAllRead, markRead };
