const TIME_ZONE = 'Europe/Rome';
const { localDateTimeToInstant } = require('../domain/time');

const localFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function queryLocalParts(date) {
  const values = Object.fromEntries(localFormatter.formatToParts(date)
    .filter(part => part.type !== 'literal')
    .map(part => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function localDateString(date) {
  const parts = queryLocalParts(date);
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function localDateTimeString(date) {
  const parts = queryLocalParts(date);
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')} ${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

function dateOnlyValue(value) {
  const parsed = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return null;
  return parsed;
}

function addCalendarDays(value, days) {
  const parsed = dateOnlyValue(value);
  if (!parsed) return null;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function weekday(value) {
  const parsed = dateOnlyValue(value);
  if (!parsed) return null;
  return parsed.getUTCDay() || 7;
}

function occurrenceInstant(date, time) {
  try {
    const earlier = localDateTimeToInstant(date, time);
    const later = localDateTimeToInstant(date, time, { disambiguation: 'later' });
    const ambiguous = earlier.getTime() !== later.getTime();
    // Europe/Rome fall-back uses the helper's documented "earlier" rule.
    return { instant: earlier, issue: ambiguous ? 'ambiguous_time' : null };
  } catch (error) {
    if (error?.code === 'INVALID_LOCAL_TIME') return { instant: null, issue: 'nonexistent_time' };
    throw error;
  }
}

function occurrenceInterval(item) {
  const start = occurrenceInstant(item.date, item.startTime);
  const end = occurrenceInstant(item.date, item.endTime);
  const issues = [start.issue, end.issue].filter(Boolean);
  if (!start.instant || !end.instant || end.instant <= start.instant) {
    return { start, end, instant: null, issue: issues[0] || 'nonexistent_time' };
  }
  return { start, end, instant: start.instant, issue: issues[0] || null };
}

function intervalOverlaps(left, right) {
  return left.startTime < right.endTime && right.startTime < left.endTime;
}

function keyFor(item) {
  return `${item.spaceId}|${item.date}|${item.startTime}|${item.endTime}`;
}

async function ensureTracking(db, nowIso) {
  const current = await db.get('SELECT id, tracking_started_at AS trackingStartedAt, consolidated_until AS consolidatedUntil FROM occurrence_tracking WHERE id = 1;');
  if (current) return { current, initialized: false };
  await db.run(
    'INSERT INTO occurrence_tracking (id, tracking_started_at, consolidated_until) VALUES (1, ?, ?);',
    [nowIso, nowIso],
  );
  return {
    current: { id: 1, trackingStartedAt: nowIso, consolidatedUntil: nowIso },
    initialized: true,
  };
}

function inWindow(item, cursor, now) {
  const interval = occurrenceInterval(item);
  if (interval.instant) return interval.instant > cursor && interval.instant <= now;
  // A nonexistent local time has no instant, but it still belongs to the
  // calendar window and must be recorded as a gap instead of disappearing.
  const localStart = `${item.date} ${item.startTime}`;
  return localStart > localDateTimeString(new Date(cursor)) && localStart <= localDateTimeString(new Date(now));
}

async function availabilityCandidates(db, cursor, now, firstDate, lastDate) {
  const rows = await db.all(
    `SELECT a.id, a.space_id AS spaceId, a.valid_from AS validFrom, a.valid_until AS validUntil,
            a.weekday, a.start_time AS startTime, a.end_time AS endTime, a.is_retired AS isRetired
       FROM availabilities a
       WHERE a.valid_until >= ? AND a.valid_from <= ? AND a.is_retired = 0;`,
    [firstDate, lastDate],
  );
  const result = new Map();

  for (const availability of rows) {
    let date = availability.validFrom > firstDate ? availability.validFrom : firstDate;
    const endDate = availability.validUntil < lastDate ? availability.validUntil : lastDate;
    while (date <= endDate) {
      if (weekday(date) === availability.weekday) {
        const item = { spaceId: availability.spaceId, date, startTime: availability.startTime, endTime: availability.endTime, availabilityId: availability.id, isRetired: Boolean(availability.isRetired) };
        if (inWindow(item, cursor, now)) result.set(keyFor(item), item);
      }
      date = addCalendarDays(date, 1);
    }
  }

  // A future booking may legitimately retain a retired availability. Include
  // that concrete occurrence even when the retired rule is no longer offered.
  const bookings = await db.all(
    `SELECT b.space_id AS spaceId, b.date, a.start_time AS startTime, a.end_time AS endTime,
            b.availability_id AS availabilityId
       FROM bookings b JOIN availabilities a ON a.id = b.availability_id
      WHERE b.date BETWEEN ? AND ?;`, [firstDate, lastDate],
  );
  for (const booking of bookings) {
    const item = { ...booking, isRetired: false };
    if (inWindow(item, cursor, now)) result.set(keyFor(item), item);
  }
  return [...result.values()];
}

async function recordIssue(db, item, issue, details, detectedAt) {
  await db.run(
    `INSERT OR IGNORE INTO occurrence_issues
       (space_id, date, start_time, end_time, issue, details, detected_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [item.spaceId, item.date, item.startTime, item.endTime, issue, details || null, detectedAt],
  );
}

async function markOverlaps(db, items, detectedAt) {
  const grouped = new Map();
  for (const item of items) {
    const groupKey = `${item.spaceId}|${item.date}`;
    if (!grouped.has(groupKey)) grouped.set(groupKey, []);
    grouped.get(groupKey).push(item);
  }
  const affected = new Set();
  for (const group of grouped.values()) {
    for (let leftIndex = 0; leftIndex < group.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < group.length; rightIndex += 1) {
        const left = group[leftIndex];
        const right = group[rightIndex];
        if (!intervalOverlaps(left, right) || keyFor(left) === keyFor(right)) continue;
        await recordIssue(db, left, 'overlapping_intervals', `Sovrapposizione con ${right.startTime}-${right.endTime}.`, detectedAt);
        await recordIssue(db, right, 'overlapping_intervals', `Sovrapposizione con ${left.startTime}-${left.endTime}.`, detectedAt);
        affected.add(keyFor(left));
        affected.add(keyFor(right));
      }
    }
  }
  return affected.size;
}

async function consolidateOccurrences(db, now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new TypeError('Ora di consolidamento non valida.');
  const nowIso = now.toISOString();
  const tracking = await ensureTracking(db, nowIso);
  const cursor = new Date(tracking.current.consolidatedUntil);
  // La fine di una prenotazione è derivabile dai suoi orari anche quando
  // manca la capienza storica: non lasciamo confirmed le righe precedenti al monitor.
  let completedBookings = 0;
  const endedCandidates = await db.all(`SELECT b.id,b.date,a.end_time AS endTime
    FROM bookings b JOIN availabilities a ON a.id=b.availability_id
    WHERE b.status='confirmed' AND b.date <= ?`, [localDateString(now)]);
  for (const booking of endedCandidates) {
    const end = occurrenceInstant(booking.date, booking.endTime);
    if (end.instant && end.instant <= now) {
      const result = await db.run("UPDATE bookings SET status='completed' WHERE id=? AND status='confirmed'", [booking.id]);
      completedBookings += result.changes;
    }
  }
  if (tracking.initialized || cursor >= now) {
    return { ...tracking.current, initialized: tracking.initialized, finalized: 0, inserted: 0, completedBookings, ambiguousOccurrences: 0, gapOccurrences: 0 };
  }

  const firstDate = localDateString(cursor);
  const lastDate = localDateString(now);
  const candidates = await availabilityCandidates(db, cursor, now.getTime(), firstDate, lastDate);
  const detectedAt = nowIso;
  let finalized = 0;
  let inserted = 0;
  let ambiguousOccurrences = 0;
  let gapOccurrences = 0;

  for (const item of candidates) {
    const interval = occurrenceInterval(item);
    if (!interval.instant) {
      await recordIssue(db, item, 'nonexistent_time', 'Orario locale inesistente nel fuso Europe/Rome.', detectedAt);
      gapOccurrences += 1;
      continue;
    }
    if (interval.issue) {
      await recordIssue(db, item, interval.issue, 'Orario locale ambiguo nel fuso Europe/Rome; usato il primo istante.', detectedAt);
      ambiguousOccurrences += 1;
    }

    const existing = await db.get(
      `SELECT id, finalized_at AS finalizedAt FROM slot_occurrences
        WHERE space_id = ? AND date = ? AND start_time = ? AND end_time = ?;`,
      [item.spaceId, item.date, item.startTime, item.endTime],
    );
    if (existing?.finalizedAt) continue;
    if (!existing) {
      await db.run(
        `INSERT INTO slot_occurrences (space_id, date, start_time, end_time)
         VALUES (?, ?, ?, ?);`,
        [item.spaceId, item.date, item.startTime, item.endTime],
      );
      inserted += 1;
    }

    const space = await db.get('SELECT capacity, status FROM spaces WHERE id = ?;', [item.spaceId]);
    if (!space) continue;
    const blocked = await db.get(
      `SELECT id FROM unavailabilities
        WHERE space_id = ? AND date = ? AND start_time < ? AND end_time > ? LIMIT 1;`,
      [item.spaceId, item.date, item.endTime, item.startTime],
    );
    const offered = space.status === 'active' && !blocked;
    await db.run(
      `UPDATE slot_occurrences
          SET offered_capacity = ?, was_offered = ?, finalized_at = ?
        WHERE space_id = ? AND date = ? AND start_time = ? AND end_time = ?
          AND finalized_at IS NULL;`,
      [offered ? space.capacity : 0, offered ? 1 : 0, detectedAt, item.spaceId, item.date, item.startTime, item.endTime],
    );
    finalized += 1;
  }

  const existingRows = await db.all(
    `SELECT space_id AS spaceId, date, start_time AS startTime, end_time AS endTime
       FROM slot_occurrences
      WHERE date BETWEEN ? AND ? AND finalized_at IS NOT NULL AND was_offered = 1;`, [firstDate, lastDate],
  );
  const overlapCount = await markOverlaps(db, existingRows, detectedAt);
  await db.run('UPDATE occurrence_tracking SET consolidated_until = ? WHERE id = 1;', [nowIso]);
  return {
    trackingStartedAt: tracking.current.trackingStartedAt,
    consolidatedUntil: nowIso,
    initialized: false,
    finalized,
    inserted,
    completedBookings,
    ambiguousOccurrences: ambiguousOccurrences + overlapCount,
    gapOccurrences,
  };
}

module.exports = {
  TIME_ZONE,
  consolidateOccurrences,
  localDateTimeString,
  occurrenceInstant,
  occurrenceInterval,
};
