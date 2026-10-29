const { getDatabase } = require("../db/db");
const { queries } = require("../db/query");
const { transaction } = require("../db/transaction");

const select = `SELECT r.id, r.space_id AS spaceId, s.name AS spaceName, r.category, r.description,
                       r.priority, r.status, (r.photo_path IS NOT NULL OR r.photo_data IS NOT NULL) AS hasPhoto, r.created_at AS createdAt,
                       r.updated_at AS updatedAt
                  FROM reports r JOIN spaces s ON s.id = r.space_id`;

function database() {
  return queries(getDatabase());
}

async function listForUser(userId, page, size) {
  const db = database();
  const total = await db.get(
    "SELECT COUNT(*) AS count FROM reports WHERE user_id = ?;",
    [userId],
  );
  const rows = await db.all(
    `${select} WHERE r.user_id = ? ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?;`,
    [userId, size, (page - 1) * size],
  );
  return { rows, total: total.count };
}

function findPhotoForUser(reportId, userId) {
  return database().get(
    "SELECT photo_path AS photo, photo_data AS photoData, photo_type AS photoType FROM reports WHERE id = ? AND user_id = ?;",
    [reportId, userId],
  );
}

async function createReport({ userId, spaceId, category, description, photoData, photoType, createdAt }) {
  return transaction(async (db) => {
    const space = await db.get("SELECT id FROM spaces WHERE id = ?;", [spaceId]);
    if (!space) return null;
    const result = await db.run(
      `INSERT INTO reports (user_id, space_id, category, description, priority, status, photo_path, photo_data, photo_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'open', NULL, ?, ?, ?, ?);`,
      [
        userId,
        spaceId,
        category,
        description,
        { technical: "high", accessibility: "high", cleaning: "medium", other: "low" }[category],
        photoData,
        photoType,
        createdAt,
        createdAt,
      ],
    );
    return db.get(`${select} WHERE r.id = ?;`, [result.lastId]);
  });
}

module.exports = { createReport, findPhotoForUser, listForUser };
