const { occupiedSeats } = require("../db/occupied-seats");
const { isMoreThanAhead, romeNow } = require("../domain/time");
const {
  catalogDatabase,
  listActiveSpaces,
  listSpaceAvailabilities,
  findBlockedSlot,
} = require("../models/catalog.model");

function dateRange(days) {
  const now = romeNow(new Date());
  const start = new Date(`${now.date}T12:00:00Z`);
  return Array.from({ length: days + 1 }, (_, index) => {
    const date = new Date(start.getTime() + index * 86400000);
    return {
      value: date.toISOString().slice(0, 10),
      weekday: date.getUTCDay() || 7,
      today: index === 0,
    };
  });
}

function requestedDates({ todayOnly = false, tomorrowOnly = false } = {}) {
  return tomorrowOnly ? dateRange(1).slice(1) : dateRange(todayOnly ? 0 : 30);
}

async function findSpaceMatch(db, space, dates, { availableNow, minSeats }, nowInstant) {
  const availabilities = await listSpaceAvailabilities(space.id, db);
  for (const date of dates) {
    for (const slot of availabilities) {
      if (
        slot.weekday !== date.weekday ||
        date.value < slot.validFrom ||
        date.value > slot.validUntil
      ) continue;
      try {
        if (!isMoreThanAhead(date.value, slot.startTime, 60 * 60, nowInstant)) continue;
      } catch (cause) {
        if (cause.code === "INVALID_LOCAL_TIME") continue;
        throw cause;
      }
      const blocked = await findBlockedSlot(
        space.id,
        date.value,
        slot.endTime,
        slot.startTime,
        db,
      );
      if (blocked || date.value < romeNow(nowInstant).date) continue;
      const occupied = await occupiedSeats(db, space.id, date.value, slot.startTime, slot.endTime);
      const free = Math.max(0, space.capacity - occupied);
      if (!free) continue;
      if (minSeats !== undefined && free < minSeats) {
        if (availableNow) continue;
        return { excluded: true };
      }
      return { date: date.value, startTime: slot.startTime, availableSeats: free };
    }
  }
  return null;
}

/**
 * Calcola gli spazi prenotabili separando: intervallo date, fasce valide,
 * blocchi eccezionali e posti occupati. Il risultato resta quello storico.
 */
async function qualifyingSpaces(options = {}) {
  const { availableNow = false, minSeats, todayOnly = false, tomorrowOnly = false } = options;
  const db = catalogDatabase();
  const dates = requestedDates({ todayOnly, tomorrowOnly });
  const nowInstant = new Date();
  const spaces = await listActiveSpaces(db);
  const result = [];
  for (const space of spaces) {
    const match = await findSpaceMatch(db, space, dates, { availableNow, minSeats }, nowInstant);
    if (match && !match.excluded) result.push({ id: space.id, ...match });
  }
  return result;
}

module.exports = { qualifyingSpaces };
