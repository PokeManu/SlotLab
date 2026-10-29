const { getDatabase } = require("../db/db");
const { queries } = require("../db/query");
const { pagination } = require("../http/pagination");
const { parsePositiveId } = require("../http/validation");
const notifications = require("../models/notifications.model");

function notificationId(value) {
  return parsePositiveId(value, {
    code: "INVALID_NOTIFICATION_ID",
    message: "Identificativo notifica non valido.",
  });
}

function mapNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    createdAt: row.createdAt,
    readAt: row.readAt,
    read: row.readAt !== null,
  };
}

function database() {
  return queries(getDatabase());
}

async function list(request, response) {
  const { page, size } = pagination(request);
  const { rows, total } = await notifications.listForUser(
    database(),
    request.user.id,
    page,
    size,
  );
  response.json({
    data: rows.map(mapNotification),
    pagination: {
      page,
      size,
      totalElements: total,
      totalPages: Math.ceil(total / size),
    },
  });
}

async function markAllRead(request, response) {
  await notifications.markAllRead(
    database(),
    request.user.id,
    new Date().toISOString(),
  );
  response.status(204).end();
}

async function markRead(request, response) {
  const id = notificationId(request.params.notificationId);
  const db = database();
  const existing = await notifications.findForUser(db, id, request.user.id);
  if (!existing)
    throw Object.assign(new Error("La notifica richiesta non esiste."), {
      status: 404,
      code: "NOTIFICATION_NOT_FOUND",
    });
  if (existing.readAt === null)
    await notifications.markRead(db, id, request.user.id, new Date().toISOString());
  response.json({ data: { id, read: true } });
}

module.exports = { list, markAllRead, markRead };
