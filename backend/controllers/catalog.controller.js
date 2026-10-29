const { occupiedSeats } = require("../db/occupied-seats");
const {
  catalogDatabase,
  listBuildings,
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
} = require("../models/catalog.model");
const { qualifyingSpaces } = require("../services/catalog.service");
const { transaction } = require("../db/transaction");
const { checkInWindow, isMoreThanAhead, parseIsoDate } = require("../domain/time");
const { invalidPagination, pagination } = require("../http/pagination");
const { parsePositiveId } = require("../http/validation");
function database() {
  return catalogDatabase();
}
function parseId(value, code) {
  return parsePositiveId(value, {
    code,
    message: "L’identificativo richiesto non è valido.",
  });
}
function parseBoolean(value) {
  if (value === undefined) return undefined;
  if (value === "true") return 1;
  if (value === "false") return 0;
  throw invalidPagination();
}
function parseDate(value) {
  const date = parseIsoDate(value);
  if (!date)
    throw Object.assign(new Error("La data richiesta non è valida."), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  return date;
}
async function servicesFor(spaceIds) {
  if (spaceIds.length === 0) return new Map();
  const rows = await listSpaceServices(spaceIds, database());
  const result = new Map();
  for (const row of rows) {
    if (!result.has(row.spaceId)) result.set(row.spaceId, []);
    result.get(row.spaceId).push(row.code);
  }
  return result;
}
function mapSpace(row, services) {
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
    services: services.get(row.id) || [],
    imageType: row.type,
  };
}
async function listBuildingsHandler(request, response) {
  const rows = await listBuildings(database());
  response.json({ data: rows });
}
async function spacesResponse(request, response) {
  const db = database();
  response.set("Cache-Control", "no-store");
  const { page, size, offset } = pagination(request);
  const accessible = parseBoolean(request.query.accessible);
  const search =
    typeof request.query.search === "string" ? request.query.search.trim() : "";
  const type =
    typeof request.query.type === "string" ? request.query.type : undefined;
  const availableNow = request.query.availableNow === "true";
  const minSeats =
    request.query.minSeats === undefined
      ? undefined
      : Number(request.query.minSeats);
  if (
    request.query.availableNow !== undefined &&
    request.query.availableNow !== "true" &&
    request.query.availableNow !== "false"
  )
    throw invalidPagination();
  if (
    minSeats !== undefined &&
    (!Number.isInteger(minSeats) || minSeats < 1 || minSeats > 1000)
  )
    throw invalidPagination();
  const conditions = [];
  const parameters = [];
  if (accessible !== undefined) {
    conditions.push("sp.accessible = ?");
    parameters.push(accessible);
  }
  if (type !== undefined) {
    if (!["study_room", "laboratory", "meeting_room"].includes(type))
      throw invalidPagination();
    conditions.push("sp.type = ?");
    parameters.push(type);
  }
  if (search) {
    conditions.push(
      "(LOWER(sp.name) LIKE LOWER(?) OR LOWER(b.name) LIKE LOWER(?) OR CAST(b.number AS TEXT) = ?)",
    );
    parameters.push(`%${search}%`, `%${search}%`, search);
  }
  if (availableNow || minSeats !== undefined) {
    const qualifying = await qualifyingSpaces({ availableNow, minSeats });
    if (!qualifying.length) {
      return response.json({
        data: [],
        pagination: { page, size, totalElements: 0, totalPages: 0 },
      });
    }
    conditions.push(`sp.id IN (${qualifying.map(() => "?").join(",")})`);
    parameters.push(...qualifying.map((item) => item.id));
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const count = await countSpaces(where, parameters, db);
  const rows = await listSpaces(where, parameters, size, offset, db);
  const services = await servicesFor(rows.map((row) => row.id));
  response.json({
    data: rows.map((row) => mapSpace(row, services)),
    pagination: {
      page,
      size,
      totalElements: count.total,
      totalPages: Math.ceil(count.total / size),
    },
  });
}
async function checkIn(request, response) {
    const spaceId = parseId(request.params.spaceId, "INVALID_SPACE_ID");
    const result = await transaction(async (db) => {
      const space = await findSpaceCapacityStatus(spaceId, db);
      if (!space)
        throw Object.assign(new Error("Lo spazio richiesto non esiste."), {
          status: 404,
          code: "SPACE_NOT_FOUND",
        });
      const bookings = await listCheckInBookings(spaceId, request.user.id, db);
      if (!bookings.length)
        throw Object.assign(
          new Error("Non esiste una prenotazione per questo spazio."),
          {
            status: 404,
            code: "NO_BOOKING_FOR_SPACE",
          },
        );
      const now = new Date();
      const checkInStatus = (date, startTime) => {
        try {
          return checkInWindow(date, startTime, now);
        } catch (cause) {
          if (cause.code === "INVALID_LOCAL_TIME") {
            throw Object.assign(new Error(cause.message), {
              status: 409,
              code: cause.code,
            });
          }
          throw cause;
        }
      };
      const booking =
        bookings.find(
          (item) => checkInStatus(item.date, item.startTime) === null,
        ) ??
        bookings.find(
          (item) => checkInStatus(item.date, item.startTime) === "early",
        ) ??
        bookings[bookings.length - 1];
      if (booking.present) return { booking, repeated: true };
      const windowError = checkInStatus(booking.date, booking.startTime);
      if (windowError === "early")
        throw Object.assign(new Error("Il check-in è troppo anticipato."), {
          status: 409,
          code: "CHECK_IN_TOO_EARLY",
        });
      if (windowError === "expired")
        throw Object.assign(new Error("Il check-in è scaduto."), {
          status: 409,
          code: "CHECK_IN_EXPIRED",
        });
      const checkedInAt = new Date().toISOString();
      await markCheckedIn(booking.bookingId, request.user.id, checkedInAt, db);
      return { booking, checkedInAt, repeated: false };
    });
    if (result.repeated)
      return response.json({
        data: {
          result: "already_checked_in",
          message: "Accesso già registrato.",
          bookingId: result.booking.bookingId,
          spaceId,
          checkedInAt: result.booking.checkedInAt,
        },
      });
    response.json({
      data: {
        result: "check_in_accepted",
        message: "Accesso consentito.",
        bookingId: result.booking.bookingId,
        spaceId,
        checkedInAt: result.checkedInAt,
      },
    });
}
async function spaceAvailability(request, response) {
  const db = database();
  const spaceId = parseId(request.params.spaceId, "INVALID_SPACE_ID");
  const requestedDate = parseDate(request.query.date);
  const space = await findSpaceCapacityStatus(spaceId, db);
  if (!space)
    throw Object.assign(new Error("Lo spazio richiesto non esiste."), {
      status: 404,
      code: "SPACE_NOT_FOUND",
    });
  const slots = await listAvailabilitySlots(spaceId, requestedDate, db);
  const unavailable = await listUnavailableSlots(spaceId, requestedDate.value, db);
  const nowInstant = new Date();
  const data = await Promise.all(
    slots.map(async (slot) => {
      let reason = null;
      const overlaps = unavailable.some(
        (item) =>
          item.startTime < slot.endTime && item.endTime > slot.startTime,
      );
      const bookedSeats = await occupiedSeats(
        db,
        spaceId,
        requestedDate.value,
        slot.startTime,
        slot.endTime,
      );
      const availableSeats = Math.max(0, space.capacity - bookedSeats);
      if (space.status !== "active") reason = "SPACE_UNAVAILABLE";
      else if (overlaps || availableSeats === 0) reason = "SLOT_UNAVAILABLE";
      else {
        try {
          if (
            !isMoreThanAhead(
              requestedDate.value,
              slot.startTime,
              60 * 60,
              nowInstant,
            )
          ) {
            reason = "BOOKING_DEADLINE_EXPIRED";
          }
        } catch (cause) {
          if (cause.code === "INVALID_LOCAL_TIME") reason = cause.code;
          else throw cause;
        }
      }
      return {
        availabilityId: slot.availabilityId,
        date: requestedDate.value,
        startTime: slot.startTime,
        endTime: slot.endTime,
        availableSeats,
        bookable: reason === null,
        reason,
      };
    }),
  );
  response.json({ data });
}
async function listSpacesHandler(request, response) {
  return spacesResponse(request, response);
}
async function recommendedSpaces(request, response) {
  const recommendations = await qualifyingSpaces({ todayOnly: true });
  const selected = recommendations.length
    ? recommendations
    : await qualifyingSpaces({ tomorrowOnly: true });
  const rows = await listRecommendedSpaces(
    selected.slice(0, 3).map((item) => item.id),
    database(),
  );
  const services = await servicesFor(rows.map((row) => row.id));
  const order = new Map(selected.map((item, index) => [item.id, index]));
  rows.sort((left, right) => order.get(left.id) - order.get(right.id));
  response.json({ data: rows.map((row) => mapSpace(row, services)) });
}
async function spaceDetails(request, response) {
  const id = parseId(request.params.spaceId, "INVALID_SPACE_ID");
  const row = await findSpace(id, database());
  if (!row)
    throw Object.assign(new Error("Lo spazio richiesto non esiste."), {
      status: 404,
      code: "SPACE_NOT_FOUND",
    });
  response.json({ data: mapSpace(row, await servicesFor([id])) });
}

module.exports = {
  listBuildings: listBuildingsHandler,
  checkIn,
  spaceAvailability,
  listSpaces: listSpacesHandler,
  recommendedSpaces,
  spaceDetails,
};
