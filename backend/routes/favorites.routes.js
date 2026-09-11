const express = require("express");
const { getDatabase } = require("../db/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const router = express.Router();
router.use(requireAuth, requireRole("user"));
function query(sql, values = []) {
  return new Promise((resolve, reject) =>
    getDatabase().all(sql, values, (error, rows) =>
      error ? reject(error) : resolve(rows),
    ),
  );
}
function run(sql, values = []) {
  return new Promise((resolve, reject) =>
    getDatabase().run(sql, values, function onRun(error) {
      error ? reject(error) : resolve({ changes: this.changes });
    }),
  );
}
function spaceId(value) {
  if (!/^[1-9][0-9]*$/.test(String(value))) {
    throw Object.assign(new Error("Identificativo spazio non valido."), {
      status: 400,
      code: "INVALID_SPACE_ID",
    });
  }
  return Number(value);
}
router.get("/", async (request, response) => {
  const page =
    request.query.page === undefined ? 1 : Number(request.query.page);
  const size =
    request.query.size === undefined ? 20 : Number(request.query.size);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > 100
  ) {
    throw Object.assign(
      new Error("I parametri di paginazione non sono validi."),
      { status: 400, code: "VALIDATION_ERROR" },
    );
  }
  const parameters = [request.user.id];
  const total = await new Promise((resolve, reject) =>
    getDatabase().get(
      "SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?;",
      parameters,
      (error, row) => (error ? reject(error) : resolve(row.count)),
    ),
  );
  const rows = await query(
    `SELECT sp.id, sp.name, sp.floor, sp.type, sp.capacity, sp.accessible, sp.status,
            b.id AS buildingId, b.number AS buildingNumber, b.name AS buildingName
       FROM favorites f JOIN spaces sp ON sp.id = f.space_id JOIN buildings b ON b.id = sp.building_id
      WHERE f.user_id = ? ORDER BY sp.name ASC, sp.id ASC LIMIT ? OFFSET ?;`,
    [request.user.id, size, (page - 1) * size],
  );
  response.json({
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      building: {
        id: row.buildingId,
        number: row.buildingNumber,
        name: row.buildingName,
      },
      floor: row.floor,
      type: row.type,
      capacity: row.capacity,
      accessible: Boolean(row.accessible),
      status: row.status,
      imageType: row.type,
      isFavorite: true,
    })),
    pagination: {
      page,
      size,
      totalElements: total,
      totalPages: Math.ceil(total / size),
    },
  });
});
router.post("/:spaceId", async (request, response) => {
  const id = spaceId(request.params.spaceId);
  const exists = await new Promise((resolve, reject) =>
    getDatabase().get(
      "SELECT id FROM spaces WHERE id = ?;",
      [id],
      (error, row) => (error ? reject(error) : resolve(row)),
    ),
  );
  if (!exists)
    throw Object.assign(new Error("Lo spazio richiesto non esiste."), {
      status: 404,
      code: "SPACE_NOT_FOUND",
    });
  const result = await run(
    "INSERT INTO favorites (user_id, space_id, created_at) VALUES (?, ?, ?) ON CONFLICT(user_id, space_id) DO NOTHING;",
    [request.user.id, id, new Date().toISOString()],
  );
  response
    .status(result.changes === 1 ? 201 : 200)
    .json({ data: { spaceId: id, isFavorite: true } });
});
router.delete("/:spaceId", async (request, response) => {
  const id = spaceId(request.params.spaceId);
  await run("DELETE FROM favorites WHERE user_id = ? AND space_id = ?;", [
    request.user.id,
    id,
  ]);
  response.status(204).end();
});
module.exports = router;
