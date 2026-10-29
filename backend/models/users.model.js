const { getDatabase } = require("../db/db");
const { queries } = require("../db/query");

function database() {
  return queries(getDatabase());
}

function findProfilePhoto(userId) {
  return database().get(
    "SELECT profile_photo AS photo, profile_photo_type AS type FROM users WHERE id = ?;",
    [userId],
  );
}

function saveProfilePhoto(userId, photo) {
  return database().run(
    "UPDATE users SET profile_photo = ?, profile_photo_type = ? WHERE id = ?;",
    [photo.data, photo.type, userId],
  );
}

function removeProfilePhoto(userId) {
  return database().run(
    "UPDATE users SET profile_photo = NULL, profile_photo_type = NULL WHERE id = ?;",
    [userId],
  );
}

function findAccountForPasswordCheck(userId) {
  return database().get("SELECT * FROM users WHERE id = ?", [userId]);
}

function findCurrentSessionUser(query, user, role, jti) {
  return query.get(
    `SELECT u.id FROM users u JOIN auth_sessions s ON s.user_id = u.id
     WHERE u.id = ? AND u.password_hash = ? AND u.role = ? AND s.access_token_jti = ?`,
    [user.id, user.password_hash, role, jti],
  );
}

async function replacePasswordAndRevokeSessions(query, userId, passwordHash) {
  await query.run("UPDATE users SET password_hash = ? WHERE id = ?", [
    passwordHash,
    userId,
  ]);
  await query.run("DELETE FROM auth_sessions WHERE user_id = ?", [userId]);
}

function findCancellationRecipients(query, userId, localNow) {
  return query.all(
    `SELECT b.id, b.date, a.start_time, s.name, p.user_id
     FROM bookings b JOIN availabilities a ON a.id = b.availability_id
     JOIN spaces s ON s.id = b.space_id JOIN booking_participants p ON p.booking_id = b.id
     WHERE b.id IN (SELECT booking_id FROM booking_participants WHERE user_id = ? AND participant_role = 'organizer')
       AND p.user_id <> ? AND b.status = 'confirmed' AND b.date || ' ' || a.start_time > ?`,
    [userId, userId, localNow],
  );
}

function addAccountCancellationNotice(query, recipient, now) {
  return query.run(
    `INSERT INTO notifications (user_id, type, title, message, created_at)
     VALUES (?, 'booking_cancelled', 'Prenotazione cancellata', ?, ?)`,
    [
      recipient.user_id,
      `La prenotazione presso ${recipient.name} del ${recipient.date} alle ${recipient.start_time} è stata cancellata per eliminazione dell'account organizzatore.`,
      now,
    ],
  );
}

function findAccountReportPhotos(query, userId) {
  return query.all(
    "SELECT photo_path FROM reports WHERE user_id = ? AND photo_path IS NOT NULL",
    [userId],
  );
}

function queueAccountPhotoDeletion(query, filename, now) {
  return query.run(
    "INSERT OR IGNORE INTO file_deletions (filename, created_at) VALUES (?, ?)",
    [filename, now],
  );
}

async function removeAccountRows(query, userId) {
  await query.run(
    `DELETE FROM bookings WHERE id IN
     (SELECT booking_id FROM booking_participants WHERE user_id = ? AND participant_role = 'organizer')`,
    [userId],
  );
  await query.run("DELETE FROM users WHERE id = ?", [userId]);
}

module.exports = {
  findProfilePhoto,
  saveProfilePhoto,
  removeProfilePhoto,
  findAccountForPasswordCheck,
  findCurrentSessionUser,
  replacePasswordAndRevokeSessions,
  findCancellationRecipients,
  addAccountCancellationNotice,
  findAccountReportPhotos,
  queueAccountPhotoDeletion,
  removeAccountRows,
};
