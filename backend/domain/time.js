const ROME_TIME_ZONE = "Europe/Rome";
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ROME_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
function partsAtRome(instant) {
  return Object.fromEntries(
    partsFormatter
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}
function parseDateTimeParts(date, time) {
  const dateMatch = DATE_PATTERN.exec(date);
  const timeMatch = TIME_PATTERN.exec(time);
  if (!dateMatch || !timeMatch) {
    throw Object.assign(
      new RangeError("Data o orario Europe/Rome non valido."),
      {
        code: "INVALID_LOCAL_TIME",
      },
    );
  }
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = timeMatch[3] === undefined ? 0 : Number(timeMatch[3]);
  const check = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    throw Object.assign(
      new RangeError("Data o orario Europe/Rome non valido."),
      {
        code: "INVALID_LOCAL_TIME",
      },
    );
  }
  return { year, month, day, hour, minute, second };
}
function sameLocalParts(actual, expected) {
  return (
    actual.year === String(expected.year).padStart(4, "0") &&
    actual.month === String(expected.month).padStart(2, "0") &&
    actual.day === String(expected.day).padStart(2, "0") &&
    actual.hour === String(expected.hour).padStart(2, "0") &&
    actual.minute === String(expected.minute).padStart(2, "0") &&
    actual.second === String(expected.second).padStart(2, "0")
  );
}
function offsetMinutesAt(instant) {
  const parts = partsAtRome(instant);
  const localAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((localAsUtc - instant.getTime()) / 60000);
}
function localDateTimeToInstant(date, time, options = {}) {
  const expected = parseDateTimeParts(date, time);
  const wallClock = Date.UTC(
    expected.year,
    expected.month - 1,
    expected.day,
    expected.hour,
    expected.minute,
    expected.second,
  );
  const offsets = new Set();
  for (const days of [-3, -2, -1, 0, 1, 2, 3]) {
    offsets.add(offsetMinutesAt(new Date(wallClock + days * 86400000)));
  }
  const candidates = [...offsets]
    .map((offset) => new Date(wallClock - offset * 60000))
    .filter((candidate) => sameLocalParts(partsAtRome(candidate), expected))
    .sort((left, right) => left.getTime() - right.getTime());
  if (candidates.length === 0) {
    throw Object.assign(
      new RangeError("L’orario locale non esiste in Europe/Rome."),
      {
        code: "INVALID_LOCAL_TIME",
      },
    );
  }
  if (candidates.length > 1 && options.disambiguation === "reject") {
    throw Object.assign(
      new RangeError("L’orario locale è ambiguo in Europe/Rome."),
      {
        code: "AMBIGUOUS_LOCAL_TIME",
      },
    );
  }
  return options.disambiguation === "later"
    ? candidates[candidates.length - 1]
    : candidates[0];
}
function romeNow(instant = new Date()) {
  const parts = partsAtRome(instant);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    second: Number(parts.second),
  };
}
function secondsUntilLocal(date, time, instant = new Date()) {
  return (
    (localDateTimeToInstant(date, time).getTime() - instant.getTime()) / 1000
  );
}
function isAtLeastAhead(date, time, seconds, instant = new Date()) {
  return secondsUntilLocal(date, time, instant) >= seconds;
}
function isMoreThanAhead(date, time, seconds, instant = new Date()) {
  return secondsUntilLocal(date, time, instant) > seconds;
}
function checkInWindow(date, startTime, instant = new Date()) {
  const seconds = secondsUntilLocal(date, startTime, instant);
  if (seconds > 15 * 60) return "early";
  if (seconds < -30 * 60) return "expired";
  return null;
}
module.exports = {
  ROME_TIME_ZONE,
  checkInWindow,
  isAtLeastAhead,
  isMoreThanAhead,
  localDateTimeToInstant,
  romeNow,
  secondsUntilLocal,
};
