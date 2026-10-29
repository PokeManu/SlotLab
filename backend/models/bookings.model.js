const { getDatabase } = require("../db/db");
const { queries } = require("../db/query");

/** Accesso condiviso alle query delle prenotazioni fuori dalle route. */
function bookingsDatabase() {
  return queries(getDatabase());
}

function findBookingForViewer(bookingId, userId, db = bookingsDatabase()) {
  return db.get(
    `SELECT b.id, b.space_id AS spaceId, s.name AS spaceName, bu.name AS building, s.floor,
            b.availability_id AS availabilityId,
            b.date, a.start_time AS startTime, a.end_time AS endTime, b.status,
            b.created_at AS createdAt
       FROM bookings b JOIN spaces s ON s.id = b.space_id JOIN buildings bu ON bu.id = s.building_id
       JOIN availabilities a ON a.id = b.availability_id
       JOIN booking_participants viewer ON viewer.booking_id = b.id
      WHERE b.id = ? AND viewer.user_id = ?;`,
    [bookingId, userId],
  );
}

function listBookingParticipants(bookingId, db = bookingsDatabase()) {
  return db.all(
    `SELECT u.id, bp.id AS participantId, u.first_name AS firstName, u.last_name AS lastName, u.email,
            bp.participant_role AS participantRole, bp.present, bp.checked_in_at AS checkedInAt
       FROM booking_participants bp JOIN users u ON u.id = bp.user_id
      WHERE bp.booking_id = ? ORDER BY bp.participant_role DESC, u.last_name, u.first_name;`,
    [bookingId],
  );
}

function countUserBookings(userId, endAfter, db = bookingsDatabase()) {
  return db.get(
    `SELECT COUNT(*) AS count FROM bookings b JOIN availabilities a ON a.id=b.availability_id JOIN booking_participants bp ON bp.booking_id = b.id
      WHERE bp.user_id = ? AND b.status = 'confirmed' AND b.date || ' ' || a.end_time > ?;`,
    [userId, endAfter],
  );
}

function listUserBookingIds(userId, endAfter, size, offset, db = bookingsDatabase()) {
  return db.all(
    `SELECT b.id FROM bookings b JOIN availabilities a ON a.id=b.availability_id JOIN booking_participants bp ON bp.booking_id = b.id
      WHERE bp.user_id = ? AND b.status = 'confirmed' AND b.date || ' ' || a.end_time > ?
      ORDER BY b.date ASC, a.start_time ASC, b.id ASC LIMIT ? OFFSET ?;`,
    [userId, endAfter, size, offset],
  );
}

function findEditableBooking(bookingId, db) {
  return db.get(
    `SELECT b.id, b.space_id AS spaceId, b.date, b.status, a.start_time AS startTime, a.end_time AS endTime
       FROM bookings b JOIN availabilities a ON a.id = b.availability_id
      WHERE b.id = ?;`,
    [bookingId],
  );
}

function findOrganizer(bookingId, db) {
  return db.get(
    `SELECT user_id AS userId FROM booking_participants
      WHERE booking_id = ? AND participant_role = 'organizer';`,
    [bookingId],
  );
}

function findUserByEmail(email, db) {
  return db.get("SELECT id FROM users WHERE email = ? AND role = 'user';", [email]);
}

function findParticipantForBooking(bookingId, userId, db) {
  return db.get(
    "SELECT id FROM booking_participants WHERE booking_id = ? AND user_id = ?;",
    [bookingId, userId],
  );
}

function findParticipantOverlap(userId, date, endTime, startTime, db) {
  return db.get(
    `SELECT b.id FROM bookings b JOIN booking_participants bp ON bp.booking_id = b.id
      JOIN availabilities a ON a.id = b.availability_id
     WHERE bp.user_id = ? AND b.date = ? AND b.status = 'confirmed' AND a.start_time < ? AND a.end_time > ?;`,
    [userId, date, endTime, startTime],
  );
}

function countFutureBookings(userId, after, db) {
  return db.get(
    `SELECT COUNT(*) AS count FROM bookings b JOIN booking_participants bp ON bp.booking_id = b.id
      JOIN availabilities a ON a.id = b.availability_id
      WHERE bp.user_id = ? AND b.status = 'confirmed' AND b.date || ' ' || a.start_time > ?;`,
    [userId, after],
  );
}

function findSpaceCapacity(spaceId, db) {
  return db.get("SELECT capacity FROM spaces WHERE id = ?;", [spaceId]);
}

function addParticipant(bookingId, userId, db) {
  return db.run(
    "INSERT INTO booking_participants (booking_id, user_id, participant_role) VALUES (?, ?, 'participant');",
    [bookingId, userId],
  );
}

function addNotification(userId, type, title, message, createdAt, db) {
  return db.run(
    "INSERT INTO notifications(user_id,type,title,message,created_at) VALUES(?,?,?,?,?)",
    [userId, type, title, message, createdAt],
  );
}

function findBookingForParticipantChange(bookingId, db) {
  return db.get(
    `SELECT b.id, b.date, b.status, a.start_time AS startTime FROM bookings b
      JOIN availabilities a ON a.id = b.availability_id WHERE b.id = ?;`,
    [bookingId],
  );
}

function findParticipantById(participantId, bookingId, db) {
  return db.get(
    "SELECT user_id AS userId, participant_role AS participantRole FROM booking_participants WHERE id = ? AND booking_id = ?;",
    [participantId, bookingId],
  );
}

function removeParticipant(participantId, db) {
  return db.run("DELETE FROM booking_participants WHERE id = ?;", [participantId]);
}

function listOtherParticipants(bookingId, userId, db) {
  return db.all(
    "SELECT user_id AS userId FROM booking_participants WHERE booking_id = ? AND user_id <> ?;",
    [bookingId, userId],
  );
}

function addCancellationNotification(userId, createdAt, db) {
  return db.run(
    `INSERT INTO notifications (user_id, type, title, message, created_at)
       VALUES (?, 'booking_cancelled', 'Prenotazione cancellata', 'Una prenotazione a cui partecipavi è stata cancellata.', ?);`,
    [userId, createdAt],
  );
}

function removeBooking(bookingId, db) {
  return db.run("DELETE FROM bookings WHERE id = ?;", [bookingId]);
}

function findParticipant(bookingId, participantId, db) {
  return db.get(
    "SELECT user_id AS userId, participant_role AS participantRole FROM booking_participants WHERE id = ? AND booking_id = ?;",
    [participantId, bookingId],
  );
}

function findBooking(bookingId, db) {
  return db.get("SELECT * FROM bookings WHERE id = ?;", [bookingId]);
}

function findBookingRequest(userId, key, db) {
  return db.get(
    "SELECT id, request_hash AS requestHash, booking_id AS bookingId FROM booking_requests WHERE user_id = ? AND idempotency_key = ?;",
    [userId, key],
  );
}

function findSlot(spaceId, availabilityId, date, weekday, db) {
  return db.get(
    `SELECT sp.capacity, sp.status, a.start_time AS startTime, a.end_time AS endTime
       FROM availabilities a JOIN spaces sp ON sp.id = a.space_id
      WHERE a.id = ? AND a.space_id = ? AND a.weekday = ? AND a.valid_from <= ? AND a.valid_until >= ? AND a.is_retired = 0;`,
    [availabilityId, spaceId, weekday, date, date],
  );
}

function findUnavailability(spaceId, date, endTime, startTime, db) {
  return db.get(
    `SELECT id FROM unavailabilities WHERE space_id = ? AND date = ? AND start_time < ? AND end_time > ?;`,
    [spaceId, date, endTime, startTime],
  );
}

function findUsersByEmails(emails, db) {
  const placeholders = emails.map(() => "?").join(",");
  return db.all(
    `SELECT id, email FROM users WHERE email IN (${placeholders}) AND role = 'user';`,
    emails,
  );
}

function insertBooking(spaceId, availabilityId, date, createdAt, db) {
  return db.run(
    `INSERT INTO bookings (space_id, availability_id, date, status, created_at) VALUES (?, ?, ?, 'confirmed', ?);`,
    [spaceId, availabilityId, date, createdAt],
  );
}

function insertBookingParticipant(bookingId, userId, role, db) {
  return db.run(
    "INSERT INTO booking_participants (booking_id, user_id, participant_role) VALUES (?, ?, ?);",
    [bookingId, userId, role],
  );
}

function insertBookingRequest(userId, key, hash, bookingId, createdAt, db) {
  return db.run(
    "INSERT INTO booking_requests (user_id, idempotency_key, request_hash, booking_id, created_at) VALUES (?, ?, ?, ?, ?);",
    [userId, key, hash, bookingId, createdAt],
  );
}

module.exports = {
  bookingsDatabase,
  findBookingForViewer,
  listBookingParticipants,
  countUserBookings,
  listUserBookingIds,
  findEditableBooking,
  findOrganizer,
  findUserByEmail,
  findParticipantForBooking,
  findParticipantOverlap,
  countFutureBookings,
  findSpaceCapacity,
  addParticipant,
  addNotification,
  findBookingForParticipantChange,
  findParticipantById,
  removeParticipant,
  listOtherParticipants,
  addCancellationNotification,
  removeBooking,
  findParticipant,
  findBooking,
  findBookingRequest,
  findSlot,
  findUnavailability,
  findUsersByEmails,
  insertBooking,
  insertBookingParticipant,
  insertBookingRequest,
};
