const { localDateTimeToInstant, romeNow } = require('../domain/time');

function validationError(message = 'Il periodo delle statistiche non è valido.') {
  return Object.assign(new Error(message), { status: 400, code: 'VALIDATION_ERROR' });
}

function isRealDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateStatisticsPeriod(query) {
  if (!query || typeof query !== 'object' || Array.isArray(query)) throw validationError();
  const keys = Object.keys(query);
  if (keys.length !== 2 || keys.some(key => key !== 'dateFrom' && key !== 'dateTo')) {
    throw validationError('Sono ammessi soltanto dateFrom e dateTo.');
  }
  const { dateFrom, dateTo } = query;
  if (!isRealDate(dateFrom) || !isRealDate(dateTo) || dateFrom > dateTo) {
    throw validationError('Le date del periodo non sono valide.');
  }
  return { dateFrom, dateTo };
}

function romeParts(value) {
  const parts = romeNow(value);
  return { year: parts.date.slice(0, 4), month: parts.date.slice(5, 7), day: parts.date.slice(8, 10), hour: parts.time.slice(0, 2), minute: parts.time.slice(3, 5) };
}

function romeDateTime(value) {
  const parts = romeParts(value);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    local: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`,
  };
}

function isTerminatedOccurrence(row, now) {
  try {
    return localDateTimeToInstant(row.date, row.endTime) <= now;
  } catch (error) {
    return false;
  }
}

function roundRatio(numerator, denominator) {
  if (!denominator) return null;
  return Math.round(((numerator / denominator) * 100 + Number.EPSILON) * 100) / 100;
}

function occurrenceKey(row) {
  return `${row.spaceId}|${row.date}|${row.startTime}|${row.endTime}`;
}

function bookingKey(row) {
  return `${row.spaceId}|${row.date}|${row.startTime}|${row.endTime}`;
}

function hasFinalizedSnapshot(row) {
  return row && row.finalizedAt !== null && row.finalizedAt !== undefined && String(row.finalizedAt).trim() !== '';
}

function isPresent(value) {
  return Number(value) === 1;
}

function parseTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp;
}

function timestampRomeDate(value) {
  const timestamp = parseTimestamp(value);
  return timestamp ? romeDateTime(timestamp).date : null;
}

function overlaps(first, second) {
  return first.startTime < second.endTime && second.startTime < first.endTime;
}

function noSuchTable(error, tableName) {
  return error && new RegExp(`no such table: ${tableName}`, 'i').test(String(error.message || error));
}

async function readTracking(db) {
  try {
    return await db.get(
      `SELECT tracking_started_at AS trackingStartedAt,
              consolidated_until AS consolidatedUntil
         FROM occurrence_tracking
        WHERE id = 1;`,
    );
  } catch (error) {
    if (noSuchTable(error, 'occurrence_tracking')) return null;
    throw error;
  }
}

async function readOccurrenceIssues(db, dateFrom, dateTo) {
  try {
    return await db.all(
      `SELECT space_id AS spaceId, date, start_time AS startTime, end_time AS endTime, issue
         FROM occurrence_issues
        WHERE date BETWEEN ? AND ?;`,
      [dateFrom, dateTo],
    );
  } catch (error) {
    if (noSuchTable(error, 'occurrence_issues')) return [];
    throw error;
  }
}

function historyCompleteness(tracking, dateFrom, dateTo, nowLocal, endedBookings, occurrencesByKey, issues) {
  if (!tracking || !tracking.trackingStartedAt) return false;

  const trackingStarted = parseTimestamp(tracking.trackingStartedAt);
  if (!trackingStarted) return false;
  if (localDateTimeToInstant(dateFrom, '00:00') < trackingStarted) return false;
  if (dateFrom > nowLocal.slice(0, 10)) return true;

  // The watermark is meaningful only up to the moment being measured. A
  // period may end in the future: those occurrences are excluded from the
  // cohort and must not make an otherwise historical result incomplete.
  const consolidated = parseTimestamp(tracking.consolidatedUntil);
  const consolidatedLocal = consolidated ? romeDateTime(consolidated).local : null;
  const measuredEnd = dateTo < nowLocal.slice(0, 10) ? `${dateTo} 23:59` : nowLocal;
  if (!consolidatedLocal || consolidatedLocal < measuredEnd) return false;

  if (issues.length) return false;

  return !endedBookings.some(booking => !hasFinalizedSnapshot(occurrencesByKey.get(bookingKey(booking))));
}

async function statistics(db, dateFrom, dateTo, now = new Date()) {
  const period = validateStatisticsPeriod({ dateFrom, dateTo });
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new TypeError('now deve essere una data valida.');

  const occurrenceRows = await db.all(
    `SELECT o.id AS occurrenceId, o.space_id AS spaceId, o.date,
            o.start_time AS startTime, o.end_time AS endTime,
            o.offered_capacity AS offeredCapacity, o.was_offered AS wasOffered,
            o.finalized_at AS finalizedAt,
            s.name AS spaceName, s.type AS spaceType
       FROM slot_occurrences o
       JOIN spaces s ON s.id = o.space_id
      WHERE o.date BETWEEN ? AND ?
      ORDER BY o.date, o.start_time, o.end_time, o.space_id, o.id;`,
    [period.dateFrom, period.dateTo],
  );

  const bookingRows = await db.all(
    `SELECT b.id AS bookingId, b.space_id AS spaceId, b.date,
            a.start_time AS startTime, a.end_time AS endTime
       FROM bookings b
       JOIN availabilities a ON a.id = b.availability_id
      WHERE b.date BETWEEN ? AND ?;`,
    [period.dateFrom, period.dateTo],
  );

  const participantRows = await db.all(
    `SELECT b.id AS bookingId, bp.id AS participantId, bp.present
       FROM bookings b
       JOIN booking_participants bp ON bp.booking_id = b.id
      WHERE b.date BETWEEN ? AND ?
      ORDER BY b.id, bp.id;`,
    [period.dateFrom, period.dateTo],
  );

  const reportRows = await db.all(
    `SELECT category, status, created_at AS createdAt
       FROM reports WHERE created_at >= ? AND created_at < ?;`,
    [localDateTimeToInstant(period.dateFrom, '00:00').toISOString(),
      new Date(localDateTimeToInstant(period.dateTo, '23:59:59').getTime() + 1000).toISOString()],
  );

  const tracking = await readTracking(db);
  const occurrenceIssues = await readOccurrenceIssues(db, period.dateFrom, period.dateTo);
  const terminatedOccurrences = occurrenceRows.filter(row => isTerminatedOccurrence(row, now));
  const offeredOccurrences = terminatedOccurrences.filter(row => hasFinalizedSnapshot(row) && Number(row.wasOffered) === 1);
  const offeredByKey = new Map(offeredOccurrences.map(row => [occurrenceKey(row), row]));
  const occurrencesByKey = new Map(terminatedOccurrences.map(row => [occurrenceKey(row), row]));
  const endedBookings = bookingRows.filter(row => isTerminatedOccurrence(row, now));
  const cohortBookings = endedBookings.filter(row => offeredByKey.has(bookingKey(row)));
  const participantByBooking = new Map();
  for (const row of participantRows) {
    if (!participantByBooking.has(row.bookingId)) participantByBooking.set(row.bookingId, []);
    participantByBooking.get(row.bookingId).push(row);
  }

  const bookingIds = new Set(cohortBookings.map(row => row.bookingId));
  const participantCount = cohortBookings.reduce((total, booking) => total + (participantByBooking.get(booking.bookingId)?.length || 0), 0);
  const presenceCount = cohortBookings.reduce(
    (total, booking) => total + (participantByBooking.get(booking.bookingId) || []).filter(row => isPresent(row.present)).length,
    0,
  );
  const offeredCapacity = offeredOccurrences.reduce((total, occurrence) => total + Number(occurrence.offeredCapacity || 0), 0);

  const dailyMap = new Map();
  for (const occurrence of offeredOccurrences) {
    if (!dailyMap.has(occurrence.date)) dailyMap.set(occurrence.date, new Set());
  }
  for (const booking of cohortBookings) dailyMap.get(booking.date)?.add(booking.bookingId);
  const daily = [...dailyMap.entries()].sort(([first], [second]) => first.localeCompare(second))
    .map(([date, ids]) => ({ date, bookings: ids.size }));

  const usageMap = new Map();
  for (const occurrence of offeredOccurrences) {
    if (!usageMap.has(occurrence.spaceType)) usageMap.set(occurrence.spaceType, 0);
  }

  const spacesMap = new Map();
  const slotsMap = new Map();
  for (const booking of cohortBookings) {
    const occurrence = offeredByKey.get(bookingKey(booking));
    const people = participantByBooking.get(booking.bookingId) || [];
    const presences = people.filter(row => isPresent(row.present)).length;
    const space = spacesMap.get(booking.spaceId) || {
      spaceId: booking.spaceId,
      spaceName: occurrence.spaceName,
      bookings: 0,
      participants: 0,
      presences: 0,
    };
    space.bookings += 1;
    space.participants += people.length;
    space.presences += presences;
    spacesMap.set(booking.spaceId, space);

    const slotId = `${booking.startTime}|${booking.endTime}`;
    const slot = slotsMap.get(slotId) || {
      startTime: booking.startTime,
      endTime: booking.endTime,
      bookings: 0,
      participants: 0,
      presences: 0,
    };
    slot.bookings += 1;
    slot.participants += people.length;
    slot.presences += presences;
    slotsMap.set(slotId, slot);
    usageMap.set(occurrence.spaceType, (usageMap.get(occurrence.spaceType) || 0) + presences);
  }

  const usageTotal = [...usageMap.values()].reduce((total, value) => total + value, 0);
  const usage = [...usageMap.entries()].sort(([first], [second]) => first.localeCompare(second))
    .map(([type, presences]) => ({ type, presences, percentage: roundRatio(presences, usageTotal) }));
  const mostBookedSpaces = [...spacesMap.values()].sort((first, second) =>
    second.bookings - first.bookings || second.participants - first.participants || first.spaceName.localeCompare(second.spaceName) || first.spaceId - second.spaceId);
  const mostUsedSlots = [...slotsMap.values()].sort((first, second) =>
    second.bookings - first.bookings || second.presences - first.presences || second.participants - first.participants || first.startTime.localeCompare(second.startTime) || first.endTime.localeCompare(second.endTime));

  const reportsByCategoryMap = new Map();
  const reportsByStatusMap = new Map();
  for (const report of reportRows) {
    const reportDate = timestampRomeDate(report.createdAt);
    if (!reportDate || reportDate < period.dateFrom || reportDate > period.dateTo) continue;
    reportsByCategoryMap.set(report.category, (reportsByCategoryMap.get(report.category) || 0) + 1);
    reportsByStatusMap.set(report.status, (reportsByStatusMap.get(report.status) || 0) + 1);
  }
  const reportsByCategory = [...reportsByCategoryMap.entries()].sort(([first], [second]) => first.localeCompare(second))
    .map(([category, count]) => ({ category, count }));
  const reportsByStatus = [...reportsByStatusMap.entries()].sort(([first], [second]) => first.localeCompare(second))
    .map(([status, count]) => ({ status, count }));

  const ambiguousIssueKeys = new Set(occurrenceIssues
    .filter(issue => issue.issue === 'ambiguous_time' || issue.issue === 'overlapping_intervals')
    .map(issue => occurrenceKey(issue)));
  const gapIssueKeys = new Set(occurrenceIssues
    .filter(issue => issue.issue === 'nonexistent_time')
    .map(issue => occurrenceKey(issue)));
  for (let index = 0; index < offeredOccurrences.length; index += 1) {
    const first = offeredOccurrences[index];
    for (const second of offeredOccurrences.slice(index + 1)) {
      if (first.spaceId === second.spaceId && first.date === second.date && overlaps(first, second)) {
        ambiguousIssueKeys.add(occurrenceKey(first));
        ambiguousIssueKeys.add(occurrenceKey(second));
      }
    }
  }
  const hasAmbiguousOccurrences = offeredOccurrences.some((first, index) => offeredOccurrences
    .slice(index + 1)
    .some(second => first.spaceId === second.spaceId && first.date === second.date && overlaps(first, second)))
    || ambiguousIssueKeys.size > 0 || gapIssueKeys.size > 0;
  const history = {
    trackingStartedAt: tracking?.trackingStartedAt || null,
    complete: !hasAmbiguousOccurrences && terminatedOccurrences.every(hasFinalizedSnapshot)
      && historyCompleteness(tracking, period.dateFrom, period.dateTo, romeDateTime(now).local, endedBookings, occurrencesByKey, occurrenceIssues),
    excludedBookings: endedBookings.filter(booking => !offeredByKey.has(bookingKey(booking))).length,
    ambiguousOccurrences: ambiguousIssueKeys.size,
    gapOccurrences: gapIssueKeys.size,
  };

  return {
    dateFrom: period.dateFrom,
    dateTo: period.dateTo,
    bookings: bookingIds.size,
    participants: participantCount,
    presences: presenceCount,
    absences: participantCount - presenceCount,
    offeredCapacity,
    utilizationRate: hasAmbiguousOccurrences ? null : roundRatio(presenceCount, offeredCapacity),
    checkInRate: roundRatio(presenceCount, participantCount),
    daily,
    usage,
    mostBookedSpaces,
    mostUsedSlots,
    reportsByCategory,
    reportsByStatus,
    history,
  };
}

module.exports = { statistics, validateStatisticsPeriod };
