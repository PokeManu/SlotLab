const { cleanDeletedFiles, photoName } = require("../security/report-files");
const { isIsoDate, romeLocalDateTime } = require("../domain/time");
const admin = require("../models/admin.model");

function validDate(value) {
  return isIsoDate(value);
}

function validTime(value) {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

async function rejectIfBookingInProgress(
  db,
  spaceId,
  now = new Date(),
  interval = null,
) {
  const local = romeLocalDateTime(now);
  const parameters = [spaceId, local, local];
  const overlap = interval
    ? " AND b.date = ? AND a.start_time < ? AND a.end_time > ?"
    : "";
  if (interval)
    parameters.push(interval.date, interval.endTime, interval.startTime);
  const booking = await admin.findBookingInProgress(db, spaceId, local, interval);
  if (booking)
    throw Object.assign(
      new Error(
        "L’operazione non è consentita durante una prenotazione in corso.",
      ),
      { status: 409, code: "BOOKING_IN_PROGRESS" },
    );
}

async function cancelBookings(db, bookings, createdAt, message) {
  for (const booking of bookings) {
    const participants = await admin.bookingParticipants(db, booking.id);
    for (const participant of participants)
      await admin.insertSpaceUnavailableNotification(db, participant.user_id, message, createdAt);
    await admin.deleteBooking(db, booking.id);
  }
}

async function reconcileAvailability(db, spaceId, body, replacedId, now) {
  const local = romeLocalDateTime(now);
  const bookings = await admin.futureSpaceBookings(db, spaceId, local);
  const incompatible = [];
  for (const booking of bookings) {
    const weekday = new Date(`${booking.date}T12:00:00Z`).getUTCDay() || 7;
    const applies =
      booking.date >= body.validFrom &&
      booking.date <= body.validUntil &&
      weekday === Number(body.weekday);
    const same =
      applies &&
      booking.start_time === body.startTime &&
      booking.end_time === body.endTime;
    const overlaps =
      applies &&
      booking.start_time < body.endTime &&
      booking.end_time > body.startTime;
    if (!same && (booking.availability_id === replacedId || overlaps)) {
      if (`${booking.date} ${booking.start_time}` <= local) {
        if (overlaps)
          throw Object.assign(
            new Error(
              "La nuova fascia si sovrappone a una prenotazione già iniziata.",
            ),
            { status: 409, code: "AVAILABILITY_OVERLAP" },
          );
      } else incompatible.push(booking);
    }
  }
  await cancelBookings(
    db,
    incompatible,
    now.toISOString(),
    "La prenotazione è stata cancellata perché la configurazione della fascia è cambiata.",
  );
}

async function queuePhotos(database, photos) {
  for (const photo of photos)
    await admin.queueFileDeletion(
      database,
      photoName(photo.photo_path),
      new Date().toISOString(),
    );
}

async function cleanupPhotos() {
  await cleanDeletedFiles().catch(() =>
    console.error("Pulizia fotografie da riprovare."),
  );
}

async function prepareSpaceDeletion(database, id) {
  const users = await admin.buildingUpcomingUsers(
    database,
    id,
    romeLocalDateTime(),
  );
  for (const user of users)
    await admin.insertSpaceUnavailableNotification(
      database,
      user.id,
      "Lo spazio della prenotazione è stato eliminato.",
      new Date().toISOString(),
    );
  await queuePhotos(database, await admin.spaceReportPhotos(database, id));
}

module.exports = {
  cancelBookings,
  cleanupPhotos,
  prepareSpaceDeletion,
  queuePhotos,
  reconcileAvailability,
  rejectIfBookingInProgress,
  validDate,
  validTime,
};
