const { getDatabase } = require("../db/db");
const { queries } = require("../db/query");
const { pagination } = require("../http/pagination");
const { parsePositiveId } = require("../http/validation");
const favorites = require("../models/favorites.model");

function spaceId(value) {
  return parsePositiveId(value, {
    code: "INVALID_SPACE_ID",
    message: "Identificativo spazio non valido.",
  });
}

function database() {
  return queries(getDatabase());
}

async function list(request, response) {
  const { page, size } = pagination(request);
  const result = await favorites.listFavorites(
    database(),
    request.user.id,
    page,
    size,
  );
  response.json({
    data: result.rows.map((row) => ({
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
      totalElements: result.total,
      totalPages: Math.ceil(result.total / size),
    },
  });
}

async function add(request, response) {
  const id = spaceId(request.params.spaceId);
  const db = database();
  if (!(await favorites.spaceExists(db, id))) {
    throw Object.assign(new Error("Lo spazio richiesto non esiste."), {
      status: 404,
      code: "SPACE_NOT_FOUND",
    });
  }
  const result = await favorites.addFavorite(
    db,
    request.user.id,
    id,
    new Date().toISOString(),
  );
  response
    .status(result.changes === 1 ? 201 : 200)
    .json({ data: { spaceId: id, isFavorite: true } });
}

async function remove(request, response) {
  const id = spaceId(request.params.spaceId);
  await favorites.removeFavorite(database(), request.user.id, id);
  response.status(204).end();
}

module.exports = { add, list, remove };
