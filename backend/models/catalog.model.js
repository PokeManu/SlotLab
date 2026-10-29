const { getDatabase } = require("../db/db");
const { queries } = require("../db/query");

/**
 * Punto unico di accesso alle letture del catalogo.
 * I controller compongono le regole applicative, mentre questo modulo
 * mantiene l'adapter SQLite condiviso e sostituibile nei test.
 */
function catalogDatabase() {
  return queries(getDatabase());
}

function listBuildings(db = catalogDatabase()) {
  return db.all(`SELECT id, number, name, address, latitude, longitude
       FROM buildings ORDER BY number ASC, id ASC;`);
}

function listActiveSpaces(db = catalogDatabase()) {
  return db.all("SELECT id, capacity, status FROM spaces WHERE status = 'active';");
}

function listSpaceAvailabilities(spaceId, db = catalogDatabase()) {
  return db.all(
    `SELECT id, valid_from AS validFrom, valid_until AS validUntil, weekday,
            start_time AS startTime, end_time AS endTime
       FROM availabilities
      WHERE space_id = ? AND is_retired = 0 ORDER BY start_time, id;`,
    [spaceId],
  );
}

function findBlockedSlot(spaceId, date, endTime, startTime, db = catalogDatabase()) {
  return db.get(
    `SELECT id FROM unavailabilities
      WHERE space_id = ? AND date = ? AND start_time < ? AND end_time > ?;`,
    [spaceId, date, endTime, startTime],
  );
}

function listSpaceServices(spaceIds, db = catalogDatabase()) {
  if (spaceIds.length === 0) return Promise.resolve([]);
  const placeholders = spaceIds.map(() => "?").join(",");
  return db.all(
    `SELECT ss.space_id AS spaceId, s.code
       FROM space_services ss JOIN services s ON s.id = ss.service_id
      WHERE ss.space_id IN (${placeholders}) ORDER BY s.code;`,
    spaceIds,
  );
}

function countSpaces(where, parameters, db = catalogDatabase()) {
  return db.get(
    `SELECT COUNT(*) AS total FROM spaces sp JOIN buildings b ON b.id = sp.building_id ${where};`,
    parameters,
  );
}

function listSpaces(where, parameters, size, offset, db = catalogDatabase()) {
  return db.all(
    `SELECT sp.id, sp.name, sp.floor, sp.type, sp.capacity, sp.accessible, sp.status,
            b.id AS buildingId, b.number AS buildingNumber, b.name AS buildingName
       FROM spaces sp JOIN buildings b ON b.id = sp.building_id ${where}
      ORDER BY sp.name ASC, sp.id ASC LIMIT ? OFFSET ?;`,
    [...parameters, size, offset],
  );
}

function findSpace(spaceId, db = catalogDatabase()) {
  return db.get(
    `SELECT sp.id, sp.name, sp.floor, sp.type, sp.capacity, sp.accessible, sp.status,
            b.id AS buildingId, b.number AS buildingNumber, b.name AS buildingName
       FROM spaces sp JOIN buildings b ON b.id = sp.building_id WHERE sp.id = ?;`,
    [spaceId],
  );
}

function findSpaceCapacityStatus(spaceId, db = catalogDatabase()) {
  return db.get("SELECT capacity, status FROM spaces WHERE id = ?;", [spaceId]);
}

function listAvailabilitySlots(spaceId, date, db = catalogDatabase()) {
  return db.all(
    `SELECT id AS availabilityId, start_time AS startTime, end_time AS endTime
       FROM availabilities
      WHERE space_id = ? AND weekday = ? AND valid_from <= ? AND valid_until >= ? AND is_retired = 0
      ORDER BY start_time ASC, id ASC;`,
    [spaceId, date.weekday, date.value, date.value],
  );
}

function listUnavailableSlots(spaceId, date, db = catalogDatabase()) {
  return db.all(
    `SELECT start_time AS startTime, end_time AS endTime FROM unavailabilities
      WHERE space_id = ? AND date = ?;`,
    [spaceId, date],
  );
}

function listCheckInBookings(spaceId, userId, db) {
  return db.all(
    `SELECT b.id AS bookingId, b.date, a.start_time AS startTime, bp.present, bp.checked_in_at AS checkedInAt
       FROM bookings b JOIN availabilities a ON a.id = b.availability_id
       JOIN booking_participants bp ON bp.booking_id = b.id
      WHERE b.space_id = ? AND b.status = 'confirmed' AND bp.user_id = ?
      ORDER BY b.date ASC, a.start_time ASC;`,
    [spaceId, userId],
  );
}

function markCheckedIn(bookingId, userId, checkedInAt, db) {
  return db.run(
    `UPDATE booking_participants SET present = 1, checked_in_at = ?
      WHERE booking_id = ? AND user_id = ? AND present = 0;`,
    [checkedInAt, bookingId, userId],
  );
}

function listRecommendedSpaces(spaceIds, db = catalogDatabase()) {
  const placeholders = spaceIds.map(() => "?").join(",") || "NULL";
  return db.all(
    `SELECT sp.id, sp.name, sp.floor, sp.type, sp.capacity, sp.accessible, sp.status,
            b.id AS buildingId, b.number AS buildingNumber, b.name AS buildingName
       FROM spaces sp JOIN buildings b ON b.id = sp.building_id WHERE sp.id IN (${placeholders});`,
    spaceIds,
  );
}

module.exports = {
  catalogDatabase,
  listBuildings,
  listActiveSpaces,
  listSpaceAvailabilities,
  findBlockedSlot,
  listSpaceServices,
  countSpaces,
  listSpaces,
  findSpace,
  findSpaceCapacityStatus,
  listAvailabilitySlots,
  listUnavailableSlots,
  listCheckInBookings,
  markCheckedIn,
  listRecommendedSpaces,
};
