const { occupiedSeats } = require("../db/occupied-seats");
const crypto = require("node:crypto");
const { validateEmail } = require("../security/validation");
const { transaction } = require("../db/transaction");
const {
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
  addParticipant: addParticipantRecord,
  addNotification,
  findBookingForParticipantChange,
  findParticipantById,
  removeParticipant: removeParticipantRecord,
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
} = require("../models/bookings.model");
const { isMoreThanAhead, parseIsoDate, romeNow } = require("../domain/time");
const { pagination } = require("../http/pagination");
const { parsePositiveId } = require("../http/validation");
function error(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}
function id(value, code) {
  return parsePositiveId(value, { code });
}
function dateInfo(value) {
  const parsed = parseIsoDate(value);
  if (!parsed)
    throw error(400, "VALIDATION_ERROR", "La data non è valida.");
  return parsed;
}
function isMoreThanOneHourAhead(date, startTime, instant) {
  try {
    return isMoreThanAhead(date, startTime, 60 * 60, instant);
  } catch (cause) {
    throw error(409, "INVALID_LOCAL_TIME", cause.message);
  }
}
function requestHash(input) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}
function publicBooking(row) {
  return {
    id: row.id,
    spaceId: row.space_id,
    availabilityId: row.availability_id,
    date: row.date,
    status: row.status,
    createdAt: row.created_at,
  };
}
async function bookingView(bookingId, userId, detailed = false) {
  const db = bookingsDatabase();
  const booking = await findBookingForViewer(bookingId, userId, db);
  if (!booking)
    throw error(
      404,
      "BOOKING_NOT_FOUND",
      "La prenotazione richiesta non esiste.",
    );
  const participants = await listBookingParticipants(bookingId, db);
  const normalizedParticipants = participants.map((participant) => ({
    ...participant,
    present: Boolean(participant.present),
  }));
  const organizer = normalizedParticipants.find(
    (participant) => participant.participantRole === "organizer",
  );
  return {
    ...booking,
    organizer,
    participants: detailed ? normalizedParticipants : undefined,
    participantCount: normalizedParticipants.length,
  };
}
async function listBookings(request, response) {
  const { page, size } = pagination(request);
  const db = bookingsDatabase();
  const now = romeNow();
  const endAfter = `${now.date} ${now.time}`;
  const total = await countUserBookings(request.user.id, endAfter, db);
  const rows = await listUserBookingIds(
    request.user.id,
    endAfter,
    size,
    (page - 1) * size,
    db,
  );
  const data = [];
  for (const row of rows)
    data.push(await bookingView(row.id, request.user.id, false));
  response.json({
    data,
    pagination: {
      page,
      size,
      totalElements: total.count,
      totalPages: Math.ceil(total.count / size),
    },
  });
}
async function bookingDetails(request, response) {
  const bookingId = id(request.params.bookingId, "INVALID_BOOKING_ID");
  response.json({ data: await bookingView(bookingId, request.user.id, true) });
}
async function loadEditableBooking(db, bookingId, userId) {
  const booking = await findEditableBooking(bookingId, db);
  if (!booking)
    throw error(
      404,
      "BOOKING_NOT_FOUND",
      "La prenotazione richiesta non esiste.",
    );
  const organizer = await findOrganizer(bookingId, db);
  if (!organizer || organizer.userId !== userId)
    throw error(
      403,
      "FORBIDDEN",
      "Solo l’organizzatore può gestire il gruppo.",
    );
  const now = new Date();
  const today = romeNow(now).date;
  if (
    booking.status !== "confirmed" ||
    booking.date < today ||
    !isMoreThanOneHourAhead(booking.date, booking.startTime, now)
  ) {
    throw error(
      409,
      "BOOKING_DEADLINE_EXPIRED",
      "Il termine per modificare la prenotazione è trascorso.",
    );
  }
  return booking;
}
async function addParticipant(request, response) {
  const bookingId = id(request.params.bookingId, "INVALID_BOOKING_ID");
  const email = (() => {
    try {
      return validateEmail(request.body?.email);
    } catch (_) {
      throw error(
        400,
        "VALIDATION_ERROR",
        "L’email partecipante non è valida.",
      );
    }
  })();
  await transaction(async (db) => {
    const booking = await loadEditableBooking(db, bookingId, request.user.id);
    const user = await findUserByEmail(email, db);
    if (!user)
      throw error(404, "PARTICIPANT_NOT_FOUND", "Il partecipante non esiste.");
    const existing = await findParticipantForBooking(bookingId, user.id, db);
    if (existing)
      throw error(
        409,
        "DUPLICATE_PARTICIPANT",
        "Il partecipante è già nella prenotazione.",
      );
    const overlap = await findParticipantOverlap(
      user.id,
      booking.date,
      booking.endTime,
      booking.startTime,
      db,
    );
    if (overlap)
      throw error(
        409,
        "BOOKING_OVERLAP",
        "Il partecipante ha una prenotazione sovrapposta.",
      );
    const current = romeNow();
    const limit = await countFutureBookings(
      user.id,
      `${current.date} ${current.time}`,
      db,
    );
    if (limit.count >= 5)
      throw error(
        409,
        "BOOKING_LIMIT_REACHED",
        "È stato raggiunto il limite di prenotazioni.",
      );
    const occupied = await occupiedSeats(
      db,
      booking.spaceId,
      booking.date,
      booking.startTime,
      booking.endTime,
    );
    const space = await findSpaceCapacity(booking.spaceId, db);
    if (occupied >= space.capacity)
      throw error(
        409,
        "INSUFFICIENT_CAPACITY",
        "I posti disponibili non sono sufficienti.",
      );
    await addParticipantRecord(bookingId, user.id, db);
    await addNotification(
      user.id,
      "participant_added",
      "Aggiunto a una prenotazione",
      `Sei stato aggiunto alla prenotazione ${bookingId}.`,
      new Date().toISOString(),
      db,
    );
  });
  response.status(201).json({ data: { bookingId, email } });
}
async function removeParticipant(request, response) {
    const bookingId = id(request.params.bookingId, "INVALID_BOOKING_ID");
    const participantId = id(
      request.params.participantId,
      "INVALID_PARTICIPANT_ID",
    );
    await transaction(async (db) => {
      const booking = await findBookingForParticipantChange(bookingId, db);
      if (!booking)
        throw error(
          404,
          "BOOKING_NOT_FOUND",
          "La prenotazione richiesta non esiste.",
        );
      const now = new Date();
      const today = romeNow(now).date;
      if (
        booking.status !== "confirmed" ||
        booking.date < today ||
        !isMoreThanOneHourAhead(booking.date, booking.startTime, now)
      ) {
        throw error(
          409,
          "BOOKING_DEADLINE_EXPIRED",
          "Il termine per modificare la prenotazione è trascorso.",
        );
      }
      const target = await findParticipantById(participantId, bookingId, db);
      if (!target)
        throw error(
          404,
          "PARTICIPANT_NOT_FOUND",
          "Il partecipante non esiste nella prenotazione.",
        );
      const organizer = await findOrganizer(bookingId, db);
      if (
        target.participantRole === "organizer" ||
        (request.user.id !== organizer.userId &&
          request.user.id !== target.userId)
      ) {
        throw error(
          403,
          "FORBIDDEN",
          "Non puoi rimuovere questo partecipante.",
        );
      }
      await removeParticipantRecord(participantId, db);
      const recipient =
        request.user.id === target.userId ? organizer.userId : target.userId;
      await addNotification(
        recipient,
        "participant_removed",
        "Partecipazione rimossa",
        `È stata rimossa una partecipazione dalla prenotazione ${bookingId}.`,
        new Date().toISOString(),
        db,
      );
    });
    response.status(204).end();
}
async function cancelBooking(request, response) {
  const bookingId = id(request.params.bookingId, "INVALID_BOOKING_ID");
  await transaction(async (db) => {
    const booking = await loadEditableBooking(db, bookingId, request.user.id);
    const participants = await listOtherParticipants(bookingId, request.user.id, db);
    const createdAt = new Date().toISOString();
    for (const participant of participants)
      await addCancellationNotification(participant.userId, createdAt, db);
    await removeBooking(bookingId, db);
  });
  response.status(204).end();
}
async function createBooking(request, response) {
  const key = request.get("Idempotency-Key");
  if (!key || key.length > 255 || !/^[A-Za-z0-9._~-]+$/.test(key)) {
    throw error(
      400,
      "VALIDATION_ERROR",
      "Idempotency-Key obbligatoria e non valida.",
    );
  }
  const body = request.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw error(
      400,
      "VALIDATION_ERROR",
      "I dati della prenotazione non sono validi.",
    );
  }
  const spaceId = id(body.spaceId, "INVALID_SPACE_ID");
  const availabilityId = id(body.availabilityId, "INVALID_AVAILABILITY_ID");
  const date = dateInfo(body.date);
  if (!Array.isArray(body.participantEmails)) {
    throw error(
      400,
      "VALIDATION_ERROR",
      "L’elenco dei partecipanti non è valido.",
    );
  }
  let participantEmails;
  try {
    participantEmails = body.participantEmails.map(validateEmail);
  } catch (e) {
    throw error(
      400,
      "VALIDATION_ERROR",
      "Una email partecipante non è valida.",
    );
  }
  if (new Set(participantEmails).size !== participantEmails.length) {
    throw error(
      409,
      "DUPLICATE_PARTICIPANT",
      "Un partecipante è stato indicato più volte.",
    );
  }
  const input = {
    spaceId,
    availabilityId,
    date: date.value,
    participantEmails,
  };
  const hash = requestHash(input);
  const nowInstant = new Date();
  const now = romeNow(nowInstant);
  const today = new Date(`${now.date}T12:00:00Z`);
  const target = new Date(`${date.value}T12:00:00Z`);
  const maxDate = new Date(today.getTime() + 30 * 86400000);
  if (date.value < now.date || target > maxDate)
    throw error(409, "BOOKING_DATE_OUT_OF_RANGE", "La data non è prenotabile.");
  const result = await transaction(async (db) => {
    const previous = await findBookingRequest(request.user.id, key, db);
    if (previous) {
      if (previous.requestHash !== hash || previous.bookingId === null)
        throw error(409, "CONFLICT", "La chiave è già stata utilizzata.");
      const existing = await findBooking(previous.bookingId, db);
      if (!existing)
        throw error(409, "CONFLICT", "La chiave è già stata utilizzata.");
      return { row: existing, replay: true };
    }
    const slot = await findSlot(
      spaceId,
      availabilityId,
      date.value,
      date.weekday,
      db,
    );
    if (!slot || slot.status !== "active")
      throw error(409, "SPACE_NOT_AVAILABLE", "Lo spazio non è disponibile.");
    if (!isMoreThanOneHourAhead(date.value, slot.startTime, nowInstant)) {
      throw error(
        409,
        "BOOKING_DEADLINE_EXPIRED",
        "Il termine per prenotare è trascorso.",
      );
    }
    const exceptional = await findUnavailability(
      spaceId,
      date.value,
      slot.endTime,
      slot.startTime,
      db,
    );
    if (exceptional)
      throw error(409, "SLOT_NOT_AVAILABLE", "La fascia non è disponibile.");
    const emails = [request.user.email, ...participantEmails];
    const users = await findUsersByEmails(emails, db);
    if (users.length !== emails.length)
      throw error(404, "PARTICIPANT_NOT_FOUND", "Un partecipante non esiste.");
    const usersByEmail = new Map(users.map((user) => [user.email, user.id]));
    const userIds = emails.map((email) => usersByEmail.get(email));
    const uniqueIds = new Set(userIds);
    if (uniqueIds.size !== userIds.length)
      throw error(
        409,
        "DUPLICATE_PARTICIPANT",
        "Un partecipante è già l’organizzatore.",
      );
    for (const userId of userIds) {
      const limit = await countFutureBookings(
        userId,
        `${now.date} ${now.time}`,
        db,
      );
      if (limit.count >= 5)
        throw error(
          409,
          "BOOKING_LIMIT_REACHED",
          "È stato raggiunto il limite di prenotazioni.",
        );
      const overlap = await findParticipantOverlap(
        userId,
        date.value,
        slot.endTime,
        slot.startTime,
        db,
      );
      if (overlap)
        throw error(
          409,
          "BOOKING_OVERLAP",
          "Il partecipante ha una prenotazione sovrapposta.",
        );
    }
    const occupied = await occupiedSeats(
      db,
      spaceId,
      date.value,
      slot.startTime,
      slot.endTime,
    );
    if (occupied + userIds.length > slot.capacity)
      throw error(
        409,
        "INSUFFICIENT_CAPACITY",
        "I posti disponibili non sono sufficienti.",
      );
    const createdAt = new Date().toISOString();
    const booking = await insertBooking(
      spaceId,
      availabilityId,
      date.value,
      createdAt,
      db,
    );
    await insertBookingParticipant(booking.lastId, userIds[0], "organizer", db);
    for (const userId of userIds.slice(1))
      await insertBookingParticipant(booking.lastId, userId, "participant", db);
    for (const userId of userIds)
      await addNotification(
        userId,
        userId === request.user.id ? "booking_created" : "participant_added",
        "Prenotazione confermata",
        `Partecipi alla prenotazione ${booking.lastId}.`,
        createdAt,
        db,
      );
    await insertBookingRequest(
      request.user.id,
      key,
      hash,
      booking.lastId,
      createdAt,
      db,
    );
    return {
      row: {
        id: booking.lastId,
        space_id: spaceId,
        availability_id: availabilityId,
        date: date.value,
        status: "confirmed",
        created_at: createdAt,
      },
      replay: false,
    };
  });
  response
    .status(result.replay ? 200 : 201)
    .json({ data: publicBooking(result.row) });
}

module.exports = {
  listBookings,
  bookingDetails,
  addParticipant,
  removeParticipant,
  cancelBooking,
  createBooking,
};
