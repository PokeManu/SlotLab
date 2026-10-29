function listBuildings(database) {
  return database.all(
    "SELECT id, number, name, address, latitude, longitude FROM buildings ORDER BY number, id;",
  );
}

function findBuilding(database, id) {
  return database.get(
    "SELECT id, number, name, address, latitude, longitude FROM buildings WHERE id = ?;",
    [id],
  );
}

function insertBuilding(database, building) {
  return database.run(
    "INSERT INTO buildings (number, name, address, latitude, longitude) VALUES (?, ?, ?, ?, ?);",
    [
      building.number,
      building.name,
      building.address,
      building.latitude,
      building.longitude,
    ],
  );
}

function updateBuilding(database, id, building) {
  return database.run(
    "UPDATE buildings SET number = ?, name = ?, address = ?, latitude = ?, longitude = ? WHERE id = ?;",
    [
      building.number,
      building.name,
      building.address,
      building.latitude,
      building.longitude,
      id,
    ],
  );
}

function countUsers(database, where, values) {
  return database.get(
    `SELECT COUNT(*) AS total FROM users u WHERE 1 = 1 ${where};`,
    values,
  );
}

function listUsers(database, where, values, size, offset) {
  return database.all(
    `SELECT u.id, u.first_name AS firstName, u.last_name AS lastName, u.email, u.role, u.created_at AS createdAt
       FROM users u WHERE 1 = 1 ${where} ORDER BY u.last_name, u.first_name, u.id LIMIT ? OFFSET ?;`,
    [...values, size, offset],
  );
}

function findUser(database, id) {
  return database.get(
    "SELECT id, first_name AS firstName, last_name AS lastName, email, role, created_at AS createdAt FROM users WHERE id = ?;",
    [id],
  );
}

function findUserForDeletion(database, id) {
  return database.get("SELECT id, role FROM users WHERE id = ?;", [id]);
}

function upcomingParticipantIds(database, id, now) {
  return database.all(
    `SELECT DISTINCT bp.user_id AS userId FROM booking_participants bp JOIN bookings b ON b.id=bp.booking_id
       JOIN availabilities a ON a.id=b.availability_id
       WHERE b.id IN (SELECT booking_id FROM booking_participants WHERE user_id=? AND participant_role='organizer')
       AND bp.user_id<>? AND b.status='confirmed' AND b.date || ' ' || a.start_time > ?`,
    [id, id, now],
  );
}

function userReportPhotos(database, id) {
  return database.all(
    "SELECT photo_path FROM reports WHERE user_id=? AND photo_path IS NOT NULL",
    [id],
  );
}

function deleteOrganizedBookings(database, id) {
  return database.run(
    "DELETE FROM bookings WHERE id IN (SELECT booking_id FROM booking_participants WHERE user_id = ? AND participant_role = 'organizer');",
    [id],
  );
}

function deleteUser(database, id) {
  return database.run("DELETE FROM users WHERE id = ?;", [id]);
}

function summary(database, date) {
  return database.get(
    `SELECT
    (SELECT COUNT(*) FROM bookings WHERE date = ?) AS bookingCount,
    (SELECT COUNT(*) FROM spaces) AS spaceCount,
    (SELECT COUNT(*) FROM spaces WHERE status = 'active') AS availableSpaceCount,
    (SELECT COUNT(*) FROM reports WHERE status <> 'resolved') AS openReportCount;`,
    [date],
  );
}

function insertAnnouncement(database, authorId, title, message, createdAt) {
  return database.run(
    "INSERT INTO announcements (author_id, title, message, created_at) VALUES (?, ?, ?, ?);",
    [authorId, title, message, createdAt],
  );
}

function deliverAnnouncement(database, id, title, message, createdAt) {
  return database.run(
    `INSERT INTO notifications (user_id, announcement_id, type, title, message, created_at)
       SELECT id, ?, 'global_announcement', ?, ?, ? FROM users WHERE role = 'user';`,
    [id, title, message, createdAt],
  );
}

function countBookings(database) {
  return database.get("SELECT COUNT(*) AS total FROM bookings;");
}

function listBookings(database, size, offset) {
  return database.all(
    `SELECT b.id, b.date, b.status, b.created_at AS createdAt, s.id AS spaceId, s.name AS spaceName,
            bu.name AS building, s.floor, a.start_time AS startTime, a.end_time AS endTime,
            COUNT(bp.id) AS participantCount,
            MAX(CASE WHEN bp.participant_role = 'organizer' THEN u.first_name || ' ' || u.last_name END) AS organizerName
       FROM bookings b JOIN spaces s ON s.id = b.space_id JOIN buildings bu ON bu.id = s.building_id
       JOIN availabilities a ON a.id = b.availability_id LEFT JOIN booking_participants bp ON bp.booking_id = b.id
       LEFT JOIN users u ON u.id = bp.user_id
      GROUP BY b.id ORDER BY b.date DESC, b.id DESC LIMIT ? OFFSET ?;`,
    [size, offset],
  );
}

function listBookingParticipants(database, bookingId) {
  return database.all(
    `SELECT u.id,u.first_name AS firstName,u.last_name AS lastName,u.email,
      bp.participant_role AS participantRole,bp.present,bp.checked_in_at AS checkedInAt
      FROM booking_participants bp JOIN users u ON u.id=bp.user_id WHERE bp.booking_id=? ORDER BY bp.id`,
    [bookingId],
  );
}

function listReports(database) {
  return database.all(`SELECT r.id, r.space_id AS spaceId, s.name AS spaceName, r.category, r.description,
            r.priority, r.status, CASE WHEN r.photo_path IS NOT NULL OR r.photo_data IS NOT NULL THEN COALESCE(r.photo_path, 'available') END AS photoPath, r.created_at AS createdAt, r.updated_at AS updatedAt,
            u.email AS authorEmail
       FROM reports r JOIN spaces s ON s.id = r.space_id JOIN users u ON u.id = r.user_id
      ORDER BY r.created_at DESC, r.id DESC;`);
}

function findReportPhoto(database, id) {
  return database.get(
    "SELECT photo_path AS photo, photo_data AS photoData, photo_type AS photoType FROM reports WHERE id = ?;",
    [id],
  );
}

function findReportStatus(database, id) {
  return database.get(
    "SELECT id, user_id AS userId, status FROM reports WHERE id = ?;",
    [id],
  );
}

function updateReportStatus(database, id, status, updatedAt) {
  return database.run(
    "UPDATE reports SET status = ?, updated_at = ? WHERE id = ?;",
    [status, updatedAt, id],
  );
}

function notifyReportUpdated(database, userId, message, updatedAt) {
  return database.run(
    `INSERT INTO notifications (user_id, type, title, message, created_at)
       VALUES (?, 'report_updated', 'Segnalazione aggiornata', ?, ?);`,
    [userId, message, updatedAt],
  );
}

function countSpaces(database, where, values) {
  return database.get(
    `SELECT COUNT(*) AS count FROM spaces sp JOIN buildings b ON b.id = sp.building_id ${where};`,
    values,
  );
}

function listSpaces(database, where, values, size, offset) {
  return database.all(
    `SELECT sp.id, sp.name, sp.floor, sp.type, sp.capacity, sp.accessible, sp.status,
            b.id AS buildingId, b.number AS buildingNumber, b.name AS buildingName
       FROM spaces sp JOIN buildings b ON b.id = sp.building_id ${where}
      ORDER BY sp.name, sp.id LIMIT ? OFFSET ?;`,
    [...values, size, offset],
  );
}

function findSpace(database, id) {
  return database.get(
    `SELECT sp.id, sp.name, sp.floor, sp.type, sp.capacity, sp.accessible, sp.status,
          b.id AS buildingId, b.number AS buildingNumber, b.name AS buildingName
     FROM spaces sp JOIN buildings b ON b.id = sp.building_id WHERE sp.id = ?;`,
    [id],
  );
}

function listSpaceServices(database, id) {
  return database.all(
    "SELECT code FROM services JOIN space_services ss ON ss.service_id=services.id WHERE ss.space_id=? ORDER BY code",
    [id],
  );
}

function findBuildingById(database, id) {
  return database.get("SELECT id FROM buildings WHERE id = ?;", [id]);
}

function insertSpace(database, space) {
  return database.run(
    `INSERT INTO spaces (building_id, name, floor, type, capacity, accessible, status) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [space.buildingId, space.name, space.floor, space.type, space.capacity, space.accessible, space.status],
  );
}

function findServiceByCode(database, code) {
  return database.get("SELECT id FROM services WHERE code = ?;", [code]);
}

function insertSpaceService(database, spaceId, serviceId) {
  return database.run("INSERT INTO space_services (space_id, service_id) VALUES (?, ?);", [spaceId, serviceId]);
}

function findSpaceRaw(database, id) {
  return database.get("SELECT * FROM spaces WHERE id = ?;", [id]);
}

function deleteSpaceServices(database, id) {
  return database.run("DELETE FROM space_services WHERE space_id=?", [id]);
}

function insertSpaceServiceByCode(database, id, code) {
  return database.run(
    "INSERT INTO space_services(space_id,service_id) SELECT ?,id FROM services WHERE code=?",
    [id, code],
  );
}

function futureSpaceIntervals(database, id, now) {
  return database.all(
    `SELECT DISTINCT b.date,a.start_time AS startTime,a.end_time AS endTime
        FROM bookings b JOIN availabilities a ON a.id=b.availability_id
        WHERE b.space_id=? AND b.status='confirmed' AND b.date || ' ' || a.end_time > ?`,
    [id, now],
  );
}

function activeSpaceParticipants(database, id, now) {
  return database.all(
    `SELECT DISTINCT bp.user_id AS userId FROM booking_participants bp JOIN bookings b ON b.id = bp.booking_id JOIN availabilities a ON a.id=b.availability_id
          WHERE b.space_id = ? AND b.status = 'confirmed' AND b.date || ' ' || a.start_time > ?;`,
    [id, now],
  );
}

function updateSpace(database, id, space) {
  return database.run(
    `UPDATE spaces SET building_id = ?, name = ?, floor = ?, type = ?, capacity = ?, accessible = ?, status = ? WHERE id = ?;`,
    [space.buildingId, space.name, space.floor, space.type, space.capacity, space.accessible, space.status, id],
  );
}

function deleteFutureSpaceBookings(database, id, now) {
  return database.run(
    "DELETE FROM bookings WHERE space_id = ? AND status = 'confirmed' AND date || ' ' || (SELECT start_time FROM availabilities WHERE id=bookings.availability_id) > ?;",
    [id, now],
  );
}

function listBuildingSpaces(database, id) {
  return database.all("SELECT id FROM spaces WHERE building_id=?", [id]);
}

function deleteBuilding(database, id) {
  return database.run("DELETE FROM buildings WHERE id = ?;", [id]);
}

function deleteSpace(database, id) {
  return database.run("DELETE FROM spaces WHERE id = ?;", [id]);
}

function findBookingInProgress(database, spaceId, local, interval) {
  const overlap = interval ? " AND b.date = ? AND a.start_time < ? AND a.end_time > ?" : "";
  const values = [spaceId, local, local];
  if (interval) values.push(interval.date, interval.endTime, interval.startTime);
  return database.get(
    `SELECT b.id FROM bookings b JOIN availabilities a ON a.id = b.availability_id
      WHERE b.space_id = ? AND b.status = 'confirmed'
        AND b.date || ' ' || a.start_time <= ? AND b.date || ' ' || a.end_time > ?${overlap}
      LIMIT 1;`,
    values,
  );
}

function bookingParticipants(database, bookingId) {
  return database.all("SELECT user_id FROM booking_participants WHERE booking_id=?", [bookingId]);
}

function insertSpaceUnavailableNotification(database, userId, message, createdAt) {
  return database.run(
    `INSERT INTO notifications(user_id,type,title,message,created_at)
        VALUES(?,'space_unavailable','Prenotazione cancellata',?,?)`,
    [userId, message, createdAt],
  );
}

function deleteBooking(database, id) {
  return database.run("DELETE FROM bookings WHERE id=?", [id]);
}

function futureSpaceBookings(database, spaceId, local) {
  return database.all(
    `SELECT b.id,b.availability_id,b.date,a.start_time,a.end_time
    FROM bookings b JOIN availabilities a ON a.id=b.availability_id
    WHERE b.space_id=? AND b.date || ' ' || a.end_time > ?`,
    [spaceId, local],
  );
}

function listAvailabilities(database, spaceId) {
  return database.all(
    `SELECT id AS availabilityId, valid_from AS validFrom, valid_until AS validUntil, weekday,
            start_time AS startTime, end_time AS endTime, is_retired AS isRetired
       FROM availabilities WHERE space_id = ? AND superseded_by_id IS NULL ORDER BY valid_from, weekday, start_time, id;`,
    [spaceId],
  );
}

function findAvailabilityOverlap(database, values) {
  return database.get(
    `SELECT id FROM availabilities WHERE space_id = ? AND is_retired = 0 AND weekday = ?
       AND valid_from <= ? AND valid_until >= ? AND start_time < ? AND end_time > ?;`,
    values,
  );
}

function findRetiredAvailability(database, id, spaceId) {
  return database.get("SELECT id FROM availabilities WHERE id=? AND space_id=? AND is_retired=1 AND superseded_by_id IS NULL", [id, spaceId]);
}

function findActiveAvailability(database, id, spaceId) {
  return database.get("SELECT id FROM availabilities WHERE id = ? AND space_id = ? AND is_retired = 0;", [id, spaceId]);
}

function findAvailabilityUpdateOverlap(database, values) {
  return database.get(
    `SELECT id FROM availabilities WHERE space_id = ? AND id <> ? AND is_retired = 0 AND weekday = ?
       AND valid_from <= ? AND valid_until >= ? AND start_time < ? AND end_time > ?;`,
    values,
  );
}

function insertAvailability(database, space) {
  return database.run(
    `INSERT INTO availabilities (space_id, valid_from, valid_until, weekday, start_time, end_time, is_retired)
         VALUES (?, ?, ?, ?, ?, ?, 0);`,
    [space.spaceId, space.validFrom, space.validUntil, space.weekday, space.startTime, space.endTime],
  );
}

function insertRetiredReplacement(database, space) {
  return database.run(
    `INSERT INTO availabilities (space_id,valid_from,valid_until,weekday,start_time,end_time,is_retired)
       VALUES (?,?,?,?,?,?,0)`,
    [space.spaceId, space.validFrom, space.validUntil, space.weekday, space.startTime, space.endTime],
  );
}

function updateBookingAvailability(database, replacementId, oldId, body) {
  return database.run(
    `UPDATE bookings SET availability_id=? WHERE availability_id=? AND date BETWEEN ? AND ?
       AND CAST(strftime('%w', date) AS INTEGER)=?`,
    [replacementId, oldId, body.validFrom, body.validUntil, body.weekday % 7],
  );
}

function supersedeAvailability(database, replacementId, oldId) {
  return database.run("UPDATE availabilities SET superseded_by_id=? WHERE id=?", [replacementId, oldId]);
}

function retireAvailability(database, id) {
  return database.run("UPDATE availabilities SET is_retired = 1 WHERE id = ?;", [id]);
}

function retireAvailabilityForSpace(database, id, spaceId) {
  return database.run("UPDATE availabilities SET is_retired = 1 WHERE id = ? AND space_id = ? AND is_retired = 0;", [id, spaceId]);
}

function listUnavailabilities(database, spaceId) {
  return database.all(
    `SELECT id, date, start_time AS startTime, end_time AS endTime, reason
       FROM unavailabilities WHERE space_id = ? ORDER BY date, start_time, id;`,
    [spaceId],
  );
}

function findUnavailability(database, id, spaceId) {
  return database.get("SELECT id FROM unavailabilities WHERE id=? AND space_id=?", [id, spaceId]);
}

function findUnavailabilityConflicts(database, values) {
  return database.all(
    `SELECT b.id FROM bookings b JOIN availabilities a ON a.id=b.availability_id
       WHERE b.space_id=? AND b.date=? AND a.start_time < ? AND a.end_time > ?
         AND b.date || ' ' || a.start_time > ?`,
    values,
  );
}

function updateUnavailability(database, id, spaceId, body) {
  return database.run("UPDATE unavailabilities SET date=?,start_time=?,end_time=?,reason=? WHERE id=? AND space_id=?", [body.date, body.startTime, body.endTime, body.reason, id, spaceId]);
}

function insertUnavailability(database, spaceId, body) {
  return database.run("INSERT INTO unavailabilities(space_id,date,start_time,end_time,reason) VALUES(?,?,?,?,?)", [spaceId, body.date, body.startTime, body.endTime, body.reason]);
}

function deleteUnavailability(database, id, spaceId) {
  return database.run("DELETE FROM unavailabilities WHERE id=? AND space_id=?", [id, spaceId]);
}

function queueFileDeletion(database, filename, createdAt) {
  return database.run(
    "INSERT OR IGNORE INTO file_deletions(filename,created_at) VALUES(?,?)",
    [filename, createdAt],
  );
}

function buildingUpcomingUsers(database, id, now) {
  return database.all(
    `SELECT DISTINCT bp.user_id AS id FROM bookings b
    JOIN availabilities a ON a.id=b.availability_id JOIN booking_participants bp ON bp.booking_id=b.id
    WHERE b.space_id=? AND b.status='confirmed' AND b.date || ' ' || a.start_time > ?`,
    [id, now],
  );
}

function spaceReportPhotos(database, id) {
  return database.all(
    "SELECT photo_path FROM reports WHERE space_id=? AND photo_path IS NOT NULL",
    [id],
  );
}

module.exports = {
  activeSpaceParticipants,
  bookingParticipants,
  countBookings,
  countSpaces,
  countUsers,
  deleteBooking,
  deleteBuilding,
  deleteFutureSpaceBookings,
  deleteOrganizedBookings,
  deleteSpaceServices,
  deleteSpace,
  deleteUnavailability,
  deleteUser,
  deliverAnnouncement,
  findActiveAvailability,
  findAvailabilityOverlap,
  findAvailabilityUpdateOverlap,
  findBuilding,
  findBuildingById,
  findBookingInProgress,
  findReportPhoto,
  findReportStatus,
  findRetiredAvailability,
  findServiceByCode,
  findSpace,
  findSpaceRaw,
  findUnavailability,
  findUnavailabilityConflicts,
  futureSpaceBookings,
  futureSpaceIntervals,
  insertAnnouncement,
  insertAvailability,
  insertBuilding,
  insertRetiredReplacement,
  insertSpace,
  insertSpaceService,
  insertSpaceServiceByCode,
  insertSpaceUnavailableNotification,
  insertUnavailability,
  listAvailabilities,
  listBookingParticipants,
  listBookings,
  listBuildings,
  listBuildingSpaces,
  listReports,
  listSpaceServices,
  listSpaces,
  listUnavailabilities,
  listUsers,
  notifyReportUpdated,
  queueFileDeletion,
  buildingUpcomingUsers,
  spaceReportPhotos,
  retireAvailability,
  retireAvailabilityForSpace,
  summary,
  supersedeAvailability,
  updateBookingAvailability,
  updateBuilding,
  updateReportStatus,
  updateSpace,
  updateUnavailability,
  upcomingParticipantIds,
  userReportPhotos,
};
