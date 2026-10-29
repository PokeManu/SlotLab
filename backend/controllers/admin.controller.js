const { getDatabase } = require("../db/db");
const { queries } = require("../db/query");
const { transaction } = require("../db/transaction");
const { consolidateOccurrences } = require("../db/occurrences");
const { romeLocalDateTime } = require("../domain/time");
const { pagination } = require("../http/pagination");
const { statistics, validateStatisticsPeriod } = require("../db/statistics");
const { sendReportPhoto } = require("../security/report-files");
const admin = require("../models/admin.model");
const {
  cancelBookings,
  cleanupPhotos,
  prepareSpaceDeletion,
  queuePhotos,
  reconcileAvailability,
  rejectIfBookingInProgress,
  validDate,
  validTime,
} = require("../services/admin.service");
const { occupiedSeats } = require("../db/occupied-seats");

const MAX_ANNOUNCEMENT_MESSAGE_LENGTH = 1000;

function database() {
  return queries(getDatabase());
}

async function createAnnouncement(request, response) {
  const body = request.body;
  if (
    !body ||
    Array.isArray(body) ||
    typeof body.title !== "string" ||
    !body.title.trim() ||
    typeof body.message !== "string" ||
    !body.message.trim() ||
    Object.keys(body).some((key) => !["title", "message"].includes(key))
  )
    throw Object.assign(
      new Error("Inserisci titolo e messaggio dell’avviso."),
      { status: 400, code: "VALIDATION_ERROR" },
    );
  const title = body.title.trim();
  const message = body.message.trim();
  if (message.length > MAX_ANNOUNCEMENT_MESSAGE_LENGTH)
    throw Object.assign(
      new Error(
        `Il messaggio non può superare ${MAX_ANNOUNCEMENT_MESSAGE_LENGTH} caratteri.`,
      ),
      { status: 400, code: "VALIDATION_ERROR" },
    );
  const createdAt = new Date().toISOString();
  const data = await transaction(async (db) => {
    await consolidateOccurrences(db);
    const announcement = await admin.insertAnnouncement(
      db,
      request.user.id,
      title,
      message,
      createdAt,
    );
    const delivered = await admin.deliverAnnouncement(
      db,
      announcement.lastId,
      title,
      message,
      createdAt,
    );
    return {
      id: announcement.lastId,
      title,
      message,
      createdAt,
      recipientCount: delivered.changes,
    };
  });
  response.status(201).json({ data });
}

async function summary(request, response) {
  const row = await admin.summary(database(), romeLocalDateTime().slice(0, 10));
  response.json({
    data: {
      bookingCount: Number(row.bookingCount),
      spaceCount: Number(row.spaceCount),
      availableSpaceCount: Number(row.availableSpaceCount),
      openReportCount: Number(row.openReportCount),
    },
  });
}

async function listStatistics(request, response) {
  const { dateFrom, dateTo } = validateStatisticsPeriod(request.query);
  const data = await transaction(async (db) => {
    const now = new Date();
    await consolidateOccurrences(db, now);
    return statistics(db, dateFrom, dateTo, now);
  });
  response.json({ data });
}

function mapAdminSpace(row, serviceCodes = [], includeServiceCodes = false) {
  return {
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
    ...(includeServiceCodes ? { serviceCodes } : {}),
  };
}

async function listSpaces(request, response) {
  const { page, size } = pagination(request);
  const where =
    typeof request.query.search === "string" && request.query.search.trim()
      ? "WHERE sp.name LIKE ? OR b.name LIKE ? OR CAST(b.number AS TEXT) = ?"
      : "";
  const search =
    typeof request.query.search === "string"
      ? request.query.search.trim().replace(/\s+/g, " ")
      : "";
  const values = where ? [`%${search}%`, `%${search}%`, search] : [];
  const { count: total } = await admin.countSpaces(database(), where, values);
  const rows = await admin.listSpaces(
    database(),
    where,
    values,
    size,
    (page - 1) * size,
  );
  response.json({
    data: rows.map((row) => mapAdminSpace(row)),
    pagination: {
      page,
      size,
      totalElements: total,
      totalPages: Math.ceil(total / size),
    },
  });
}

async function getSpace(request, response) {
  const id = Number(request.params.spaceId);
  if (!Number.isInteger(id) || id < 1)
    throw Object.assign(new Error("Identificativo spazio non valido."), {
      status: 400,
      code: "INVALID_SPACE_ID",
    });
  const row = await admin.findSpace(database(), id);
  if (!row)
    throw Object.assign(new Error("Lo spazio richiesto non esiste."), {
      status: 404,
      code: "SPACE_NOT_FOUND",
    });
  const serviceRows = await admin.listSpaceServices(database(), id);
  response.json({
    data: mapAdminSpace(
      row,
      serviceRows.map((service) => service.code),
      true,
    ),
  });
}

const SPACE_TYPES = ["study_room", "laboratory", "meeting_room"];
const SPACE_STATUSES = ["active", "maintenance", "deactivated"];
const SERVICE_CODES = [
  "wifi",
  "power_outlets",
  "projector",
  "computer",
  "air_conditioning",
];

function validateSpaceBody(body, partial = false) {
  const serviceCodes =
    body.serviceCodes === undefined
      ? undefined
      : Array.isArray(body.serviceCodes)
        ? [...new Set(body.serviceCodes)]
        : null;
  if (
    (!partial &&
      (typeof body.name !== "string" ||
        !body.name.trim() ||
        !Number.isInteger(Number(body.buildingId)) ||
        Number(body.buildingId) < 1 ||
        !Number.isInteger(Number(body.floor)) ||
        !SPACE_TYPES.includes(body.type) ||
        !Number.isInteger(Number(body.capacity)) ||
        Number(body.capacity) < 1 ||
        ![true, false, 0, 1].includes(body.accessible) ||
        !SPACE_STATUSES.includes(body.status))) ||
    (partial &&
      (typeof body.name !== "string" ||
        !body.name.trim() ||
        !Number.isInteger(Number(body.buildingId ?? body.building_id)) ||
        Number(body.buildingId ?? body.building_id) < 1 ||
        !Number.isInteger(Number(body.floor)) ||
        !SPACE_TYPES.includes(body.type) ||
        !Number.isInteger(Number(body.capacity)) ||
        Number(body.capacity) < 1 ||
        !SPACE_STATUSES.includes(body.status))) ||
    serviceCodes === null ||
    serviceCodes?.some((code) => !SERVICE_CODES.includes(code))
  )
    throw Object.assign(
      new Error(
        partial ? "Dati dello spazio non validi." : "I dati dello spazio non sono validi.",
      ),
      { status: 400, code: "VALIDATION_ERROR" },
    );
  return serviceCodes ?? [];
}

async function createSpace(request, response) {
  const body = request.body || {};
  const serviceCodes = validateSpaceBody(body);
  const created = await transaction(async (db) => {
    await consolidateOccurrences(db);
    const building = await admin.findBuildingById(db, Number(body.buildingId));
    if (!building)
      throw Object.assign(new Error("L’edificio richiesto non esiste."), {
        status: 404,
        code: "BUILDING_NOT_FOUND",
      });
    const row = await admin.insertSpace(db, {
      buildingId: Number(body.buildingId),
      name: body.name.trim(),
      floor: Number(body.floor),
      type: body.type,
      capacity: Number(body.capacity),
      accessible: body.status === "active" && Boolean(body.accessible) ? 1 : 0,
      status: body.status,
    });
    for (const code of serviceCodes) {
      const service = await admin.findServiceByCode(db, code);
      if (service)
        await admin.insertSpaceService(db, row.lastId, service.id);
    }
    return row.lastId;
  });
  response.status(201).json({ data: { id: created } });
}

async function updateSpace(request, response) {
  const id = Number(request.params.spaceId);
  if (!Number.isInteger(id) || id < 1)
    throw Object.assign(new Error("Identificativo spazio non valido."), {
      status: 400,
      code: "INVALID_SPACE_ID",
    });
  const next = await transaction(async (db) => {
    await consolidateOccurrences(db);
    const current = await admin.findSpaceRaw(db, id);
    if (!current)
      throw Object.assign(new Error("Lo spazio richiesto non esiste."), {
        status: 404,
        code: "SPACE_NOT_FOUND",
      });
    const body = request.body || {};
    const serviceCodes = validateSpaceBody({ ...current, ...body }, true);
    const next = { ...current, ...body };
    if (body.serviceCodes !== undefined) {
      await admin.deleteSpaceServices(db, id);
      for (const code of serviceCodes)
        await admin.insertSpaceServiceByCode(db, id, code);
    }
    const capacity = Number(next.capacity);
    if (capacity < current.capacity) {
      const intervals = await admin.futureSpaceIntervals(db, id, romeLocalDateTime());
      for (const interval of intervals)
        if (
          (await occupiedSeats(
            db,
            id,
            interval.date,
            interval.startTime,
            interval.endTime,
          )) > capacity
        )
          throw Object.assign(
            new Error("La nuova capienza è inferiore ai posti già prenotati."),
            { status: 409, code: "CAPACITY_REDUCTION_CONFLICT" },
          );
    }
    const statusChanged =
      current.status === "active" && next.status !== "active";
    if (statusChanged) {
      await rejectIfBookingInProgress(db, id);
      const participants = await admin.activeSpaceParticipants(db, id, romeLocalDateTime());
      const createdAt = new Date().toISOString();
      for (const participant of participants)
        await admin.insertSpaceUnavailableNotification(
          db,
          participant.userId,
          "Una prenotazione è stata cancellata perché lo spazio non è disponibile.",
          createdAt,
        );
      await admin.deleteFutureSpaceBookings(db, id, romeLocalDateTime());
    }
    await admin.updateSpace(db, id, {
      buildingId: Number(body.buildingId ?? current.building_id),
      name: next.name.trim(),
      floor: Number(next.floor),
      type: next.type,
      capacity,
      accessible: next.status === "active" && Boolean(next.accessible) ? 1 : 0,
      status: next.status,
    });
    return {
      ...next,
      accessible: next.status === "active" && Boolean(next.accessible),
    };
  });
  response.json({
    data: {
      id,
      name: next.name.trim(),
      floor: Number(next.floor),
      type: next.type,
      capacity: Number(next.capacity),
      accessible: Boolean(next.accessible),
      status: next.status,
    },
  });
}

async function deleteSpace(request, response) {
  const id = Number(request.params.spaceId);
  if (!Number.isInteger(id) || id < 1)
    throw Object.assign(new Error("Identificativo spazio non valido."), {
      status: 400,
      code: "INVALID_SPACE_ID",
    });
  await transaction(async (db) => {
    await consolidateOccurrences(db);
    const space = await admin.findSpaceRaw(db, id);
    if (!space)
      throw Object.assign(new Error("Lo spazio richiesto non esiste."), {
        status: 404,
        code: "SPACE_NOT_FOUND",
      });
    await rejectIfBookingInProgress(db, id);
    await prepareSpaceDeletion(db, id);
    await admin.deleteSpace(db, id);
  });
  await cleanupPhotos();
  response.status(204).end();
}

function availabilityInput(spaceId, body) {
  if (
    !Number.isInteger(spaceId) ||
    spaceId < 1 ||
    !validDate(body.validFrom) ||
    !validDate(body.validUntil) ||
    body.validUntil < body.validFrom ||
    !Number.isInteger(Number(body.weekday)) ||
    Number(body.weekday) < 1 ||
    Number(body.weekday) > 7 ||
    !validTime(body.startTime) ||
    !validTime(body.endTime) ||
    body.endTime <= body.startTime
  )
    throw Object.assign(new Error("Dati disponibilità non validi."), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
}

function availabilityResponse(availabilityId, spaceId, body) {
  return {
    availabilityId,
    spaceId,
    validFrom: body.validFrom,
    validUntil: body.validUntil,
    weekday: Number(body.weekday),
    startTime: body.startTime,
    endTime: body.endTime,
    isRetired: false,
  };
}

async function listAvailability(request, response) {
  const spaceId = Number(request.params.spaceId);
  if (!Number.isInteger(spaceId) || spaceId < 1)
    throw Object.assign(new Error("Identificativo spazio non valido."), {
      status: 400,
      code: "INVALID_SPACE_ID",
    });
  const rows = await admin.listAvailabilities(database(), spaceId);
  response.json({
    data: rows.map((row) => ({ ...row, isRetired: Boolean(row.isRetired) })),
  });
}

async function createAvailability(request, response) {
  const spaceId = Number(request.params.spaceId);
  const body = request.body || {};
  availabilityInput(spaceId, body);
  const created = await transaction(async (db) => {
    await consolidateOccurrences(db);
    const space = await admin.findSpaceRaw(db, spaceId);
    if (!space)
      throw Object.assign(new Error("Lo spazio richiesto non esiste."), {
        status: 404,
        code: "SPACE_NOT_FOUND",
      });
    const overlap = await admin.findAvailabilityOverlap(db, [spaceId, Number(body.weekday), body.validUntil, body.validFrom, body.endTime, body.startTime]);
    if (overlap)
      throw Object.assign(new Error("La fascia si sovrappone a una configurazione attiva."), {
        status: 409,
        code: "AVAILABILITY_OVERLAP",
      });
    await reconcileAvailability(db, spaceId, body, null, new Date());
    return (await admin.insertAvailability(db, {
      spaceId,
      validFrom: body.validFrom,
      validUntil: body.validUntil,
      weekday: Number(body.weekday),
      startTime: body.startTime,
      endTime: body.endTime,
    })).lastId;
  });
  response.status(201).json({ data: availabilityResponse(created, spaceId, body) });
}

async function reuseAvailability(request, response) {
  const spaceId = Number(request.params.spaceId);
  const availabilityId = Number(request.params.availabilityId);
  const body = request.body || {};
  availabilityInput(spaceId, body);
  if (!Number.isInteger(availabilityId))
    throw Object.assign(new Error("Dati disponibilità non validi."), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  const created = await transaction(async (db) => {
    await consolidateOccurrences(db);
    const source = await admin.findRetiredAvailability(db, availabilityId, spaceId);
    if (!source)
      throw Object.assign(new Error("La fascia ritirata richiesta non esiste."), {
        status: 404,
        code: "AVAILABILITY_NOT_FOUND",
      });
    const overlap = await admin.findAvailabilityOverlap(db, [spaceId, Number(body.weekday), body.validUntil, body.validFrom, body.endTime, body.startTime]);
    if (overlap)
      throw Object.assign(new Error("La fascia si sovrappone a una configurazione attiva."), {
        status: 409,
        code: "AVAILABILITY_OVERLAP",
      });
    await reconcileAvailability(db, spaceId, body, availabilityId, new Date());
    const replacement = await admin.insertRetiredReplacement(db, {
      spaceId,
      validFrom: body.validFrom,
      validUntil: body.validUntil,
      weekday: Number(body.weekday),
      startTime: body.startTime,
      endTime: body.endTime,
    });
    await admin.updateBookingAvailability(db, replacement.lastId, availabilityId, {
      validFrom: body.validFrom,
      validUntil: body.validUntil,
      weekday: Number(body.weekday),
    });
    await admin.supersedeAvailability(db, replacement.lastId, availabilityId);
    return replacement.lastId;
  });
  response.status(201).json({ data: availabilityResponse(created, spaceId, body) });
}

async function listUnavailability(request, response) {
  const spaceId = Number(request.params.spaceId);
  if (!Number.isInteger(spaceId) || spaceId < 1)
    throw Object.assign(new Error("Identificativo spazio non valido."), {
      status: 400,
      code: "INVALID_SPACE_ID",
    });
  response.json({ data: await admin.listUnavailabilities(database(), spaceId) });
}

async function saveUnavailability(request, response) {
  const spaceId = Number(request.params.spaceId);
  const body = request.body || {};
  const unavailabilityId =
    request.params.unavailabilityId === undefined ? null : Number(request.params.unavailabilityId);
  if (
    (unavailabilityId !== null && (!Number.isInteger(unavailabilityId) || unavailabilityId < 1)) ||
    !Number.isInteger(spaceId) || spaceId < 1 || !validDate(body.date) ||
    !validTime(body.startTime) || !validTime(body.endTime) || body.endTime <= body.startTime ||
    typeof body.reason !== "string" || !body.reason.trim()
  )
    throw Object.assign(new Error(unavailabilityId === null ? "Dati indisponibilità non validi." : "Identificativo indisponibilità non valido."), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  const id = await transaction(async (db) => {
    await consolidateOccurrences(db);
    if (!(await admin.findSpaceRaw(db, spaceId)))
      throw Object.assign(new Error("Lo spazio richiesto non esiste."), { status: 404, code: "SPACE_NOT_FOUND" });
    if (unavailabilityId !== null && !(await admin.findUnavailability(db, unavailabilityId, spaceId)))
      throw Object.assign(new Error("L’indisponibilità richiesta non esiste."), { status: 404, code: "UNAVAILABILITY_NOT_FOUND" });
    const now = new Date();
    await rejectIfBookingInProgress(db, spaceId, now, body);
    const conflicts = await admin.findUnavailabilityConflicts(db, [spaceId, body.date, body.endTime, body.startTime, romeLocalDateTime(now)]);
    await cancelBookings(db, conflicts, now.toISOString(), "La prenotazione è stata cancellata per indisponibilità dello spazio.");
    if (unavailabilityId !== null) {
      await admin.updateUnavailability(db, unavailabilityId, spaceId, {
        date: body.date,
        startTime: body.startTime,
        endTime: body.endTime,
        reason: body.reason.trim(),
      });
      return unavailabilityId;
    }
    return (await admin.insertUnavailability(db, spaceId, {
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      reason: body.reason.trim(),
    })).lastId;
  });
  response.status(unavailabilityId === null ? 201 : 200).json({ data: { id, spaceId, date: body.date, startTime: body.startTime, endTime: body.endTime, reason: body.reason.trim() } });
}

async function updateAvailability(request, response) {
  const spaceId = Number(request.params.spaceId);
  const availabilityId = Number(request.params.availabilityId);
  const body = request.body || {};
  availabilityInput(spaceId, body);
  if (!Number.isInteger(availabilityId))
    throw Object.assign(new Error("Dati disponibilità non validi."), { status: 400, code: "VALIDATION_ERROR" });
  const created = await transaction(async (db) => {
    await consolidateOccurrences(db);
    const current = await admin.findActiveAvailability(db, availabilityId, spaceId);
    if (!current) throw Object.assign(new Error("La disponibilità richiesta non esiste."), { status: 404, code: "AVAILABILITY_NOT_FOUND" });
    const overlap = await admin.findAvailabilityUpdateOverlap(db, [spaceId, availabilityId, Number(body.weekday), body.validUntil, body.validFrom, body.endTime, body.startTime]);
    if (overlap) throw Object.assign(new Error("La fascia si sovrappone a una configurazione attiva."), { status: 409, code: "AVAILABILITY_OVERLAP" });
    await reconcileAvailability(db, spaceId, body, availabilityId, new Date());
    await admin.retireAvailability(db, availabilityId);
    return (await admin.insertAvailability(db, {
      spaceId,
      validFrom: body.validFrom,
      validUntil: body.validUntil,
      weekday: Number(body.weekday),
      startTime: body.startTime,
      endTime: body.endTime,
    })).lastId;
  });
  response.json({ data: availabilityResponse(created, spaceId, body) });
}

async function deleteAvailability(request, response) {
  const spaceId = Number(request.params.spaceId);
  const availabilityId = Number(request.params.availabilityId);
  await transaction(async (db) => {
    await consolidateOccurrences(db);
    const result = await admin.retireAvailabilityForSpace(db, availabilityId, spaceId);
    if (!result.changes) throw Object.assign(new Error("La disponibilità richiesta non esiste."), { status: 404, code: "AVAILABILITY_NOT_FOUND" });
  });
  response.status(204).end();
}

async function deleteUnavailability(request, response) {
  const spaceId = Number(request.params.spaceId);
  const unavailabilityId = Number(request.params.unavailabilityId);
  await transaction(async (db) => {
    await consolidateOccurrences(db);
    const result = await admin.deleteUnavailability(db, unavailabilityId, spaceId);
    if (!result.changes) throw Object.assign(new Error("L’indisponibilità richiesta non esiste."), { status: 404, code: "UNAVAILABILITY_NOT_FOUND" });
  });
  response.status(204).end();
}

async function listBookings(request, response) {
  const { page, size } = pagination(request);
  const total = await admin.countBookings(database());
  const rows = await admin.listBookings(database(), size, (page - 1) * size);
  const now = romeLocalDateTime();
  for (const row of rows) {
    if (`${row.date} ${row.endTime}` <= now) row.status = "completed";
    row.participants = await admin.listBookingParticipants(database(), row.id);
    row.participants = row.participants.map((person) => ({
      ...person,
      present: Boolean(person.present),
    }));
  }
  response.json({
    data: rows,
    pagination: {
      page,
      size,
      totalElements: total.total,
      totalPages: Math.ceil(total.total / size),
    },
  });
}

async function listReports(request, response) {
  response.json({ data: await admin.listReports(database()) });
}

async function reportPhoto(request, response) {
  const id = Number(request.params.reportId);
  if (!Number.isSafeInteger(id) || id < 1)
    throw Object.assign(new Error("Identificativo segnalazione non valido."), {
      status: 400,
    });
  const report = await admin.findReportPhoto(database(), id);
  if (!report || (!report.photo && !report.photoData))
    throw Object.assign(new Error("Foto non disponibile."), {
      status: 404,
      code: "PHOTO_NOT_FOUND",
    });
  await sendReportPhoto(
    report.photo,
    response,
    report.photoData,
    report.photoType,
  );
}

async function updateReportStatus(request, response) {
  const id = Number(request.params.reportId);
  const nextStatus = request.body?.status;
  if (
    !Number.isInteger(id) ||
    id < 1 ||
    !["in_progress", "resolved"].includes(nextStatus)
  )
    throw Object.assign(new Error("Stato segnalazione non valido."), {
      status: 400,
      code: "INVALID_REPORT_STATUS",
    });
  await transaction(async (db) => {
    await consolidateOccurrences(db);
    const report = await admin.findReportStatus(db, id);
    if (!report)
      throw Object.assign(new Error("La segnalazione richiesta non esiste."), {
        status: 404,
        code: "REPORT_NOT_FOUND",
      });
    if (
      (report.status === "open" &&
        !["in_progress", "resolved"].includes(nextStatus)) ||
      (report.status === "in_progress" && nextStatus !== "resolved") ||
      report.status === "resolved"
    )
      throw Object.assign(new Error("Transizione di stato non consentita."), {
        status: 409,
        code: "INVALID_REPORT_STATUS_TRANSITION",
      });
    const updatedAt = new Date().toISOString();
    await admin.updateReportStatus(db, id, nextStatus, updatedAt);
    await admin.notifyReportUpdated(
      db,
      report.userId,
      `La tua segnalazione è ora ${nextStatus === "in_progress" ? "in lavorazione" : "risolta"}.`,
      updatedAt,
    );
  });
  response.json({ data: { id, status: nextStatus } });
}

function buildingId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1)
    throw Object.assign(new Error("Identificativo edificio non valido."), {
      status: 400,
      code: "INVALID_BUILDING_ID",
    });
  return id;
}

function userId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1)
    throw Object.assign(new Error("Identificativo utente non valido."), {
      status: 400,
      code: "INVALID_USER_ID",
    });
  return id;
}

function validateBuilding(body) {
  const number = Number(body?.number);
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  if (
    !Number.isInteger(number) ||
    number < 1 ||
    typeof body?.name !== "string" ||
    !body.name.trim() ||
    typeof body?.address !== "string" ||
    !body.address.trim() ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  )
    throw Object.assign(new Error("I dati dell’edificio non sono validi."), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  return {
    number,
    name: body.name.trim(),
    address: body.address.trim(),
    latitude,
    longitude,
  };
}

function buildingResponse(id, building) {
  return {
    id,
    number: Number(building.number),
    name: building.name.trim(),
    address: building.address.trim(),
    latitude: Number(building.latitude),
    longitude: Number(building.longitude),
  };
}

async function listBuildings(request, response) {
  response.json({ data: await admin.listBuildings(database()) });
}

async function createBuilding(request, response) {
  const building = validateBuilding(request.body);
  try {
    const { lastId: id } = await admin.insertBuilding(database(), building);
    response.status(201).json({ data: buildingResponse(id, building) });
  } catch (cause) {
    if (cause.code === "SQLITE_CONSTRAINT")
      throw Object.assign(new Error("Il numero ufficiale è già utilizzato."), {
        status: 409,
        code: "BUILDING_NUMBER_ALREADY_EXISTS",
      });
    throw cause;
  }
}

async function updateBuilding(request, response) {
  const id = buildingId(request.params.buildingId);
  const allowed = ["number", "name", "address", "latitude", "longitude"];
  const body = request.body || {};
  const keys = Object.keys(body);
  if (!keys.length || keys.some((key) => !allowed.includes(key)))
    throw Object.assign(new Error("Dati edificio non validi."), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  const current = await admin.findBuilding(database(), id);
  if (!current)
    throw Object.assign(new Error("L’edificio richiesto non esiste."), {
      status: 404,
      code: "BUILDING_NOT_FOUND",
    });
  const next = validateBuilding({ ...current, ...body });
  try {
    await admin.updateBuilding(database(), id, next);
  } catch (cause) {
    if (cause.code === "SQLITE_CONSTRAINT")
      throw Object.assign(new Error("Il numero ufficiale è già utilizzato."), {
        status: 409,
        code: "BUILDING_NUMBER_ALREADY_EXISTS",
      });
    throw cause;
  }
  response.json({ data: buildingResponse(id, next) });
}

async function deleteBuilding(request, response) {
  const id = buildingId(request.params.buildingId);
  await transaction(async (db) => {
    await consolidateOccurrences(db);
    const building = await admin.findBuildingById(db, id);
    if (!building)
      throw Object.assign(new Error("L’edificio richiesto non esiste."), {
        status: 404,
        code: "BUILDING_NOT_FOUND",
      });
    for (const space of await admin.listBuildingSpaces(db, id))
      await prepareSpaceDeletion(db, space.id);
    await admin.deleteBuilding(db, id);
  });
  await cleanupPhotos();
  response.status(204).end();
}

async function listUsers(request, response) {
  const { page, size } = pagination(request);
  const search =
    typeof request.query.search === "string"
      ? request.query.search.trim().replace(/\s+/g, " ")
      : "";
  const where = search
    ? "AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR TRIM(u.first_name) || ' ' || TRIM(u.last_name) LIKE ?)"
    : "";
  const values = search
    ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
    : [];
  const total = await admin.countUsers(database(), where, values);
  const rows = await admin.listUsers(
    database(),
    where,
    values,
    size,
    (page - 1) * size,
  );
  response.json({
    data: rows,
    pagination: {
      page,
      size,
      totalElements: total.total,
      totalPages: Math.ceil(total.total / size),
    },
  });
}

async function deleteUser(request, response) {
  const id = userId(request.params.userId);
  await transaction(async (db) => {
    await consolidateOccurrences(db);
    const user = await admin.findUserForDeletion(db, id);
    if (!user)
      throw Object.assign(new Error("L’utente richiesto non esiste."), {
        status: 404,
        code: "USER_NOT_FOUND",
      });
    if (user.role === "admin")
      throw Object.assign(
        new Error(
          "Gli amministratori non possono essere eliminati da questa funzione.",
        ),
        { status: 403, code: "FORBIDDEN" },
      );
    const participants = await admin.upcomingParticipantIds(
      db,
      id,
      romeLocalDateTime(),
    );
    await queuePhotos(db, await admin.userReportPhotos(db, id));
    const createdAt = new Date().toISOString();
    for (const participant of participants)
      await admin.insertSpaceUnavailableNotification(
        db,
        participant.userId,
        "Una prenotazione è stata cancellata perché l’account è stato eliminato.",
        createdAt,
      );
    await admin.deleteOrganizedBookings(db, id);
    await admin.deleteUser(db, id);
  });
  await cleanupPhotos();
  response.status(204).end();
}

module.exports = {
  createAnnouncement,
  createBuilding,
  createSpace,
  createAvailability,
  deleteBuilding,
  deleteSpace,
  deleteAvailability,
  deleteUnavailability,
  deleteUser,
  listBuildings,
  listBookings,
  listUsers,
  listReports,
  listSpaces,
  getSpace,
  listAvailability,
  listUnavailability,
  updateSpace,
  updateAvailability,
  reuseAvailability,
  saveUnavailability,
  listStatistics,
  reportPhoto,
  summary,
  updateReportStatus,
  updateBuilding,
};
