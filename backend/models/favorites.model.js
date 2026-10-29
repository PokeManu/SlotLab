async function listFavorites(database, userId, page, size) {
  const total = await database.get(
    "SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?;",
    [userId],
  );
  const rows = await database.all(
    `SELECT sp.id, sp.name, sp.floor, sp.type, sp.capacity, sp.accessible, sp.status,
            b.id AS buildingId, b.number AS buildingNumber, b.name AS buildingName
       FROM favorites f JOIN spaces sp ON sp.id = f.space_id JOIN buildings b ON b.id = sp.building_id
      WHERE f.user_id = ? ORDER BY sp.name ASC, sp.id ASC LIMIT ? OFFSET ?;`,
    [userId, size, (page - 1) * size],
  );
  return { total: total.count, rows };
}

async function spaceExists(database, spaceId) {
  return database.get("SELECT id FROM spaces WHERE id = ?;", [spaceId]);
}

async function addFavorite(database, userId, spaceId, createdAt) {
  return database.run(
    "INSERT INTO favorites (user_id, space_id, created_at) VALUES (?, ?, ?) ON CONFLICT(user_id, space_id) DO NOTHING;",
    [userId, spaceId, createdAt],
  );
}

async function removeFavorite(database, userId, spaceId) {
  return database.run("DELETE FROM favorites WHERE user_id = ? AND space_id = ?;", [
    userId,
    spaceId,
  ]);
}

module.exports = {
  addFavorite,
  listFavorites,
  removeFavorite,
  spaceExists,
};
