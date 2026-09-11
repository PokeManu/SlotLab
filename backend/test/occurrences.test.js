const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const sqlite3 = require("sqlite3");
const { after, test } = require("node:test");
const { migrate } = require("../db/migrate");
const {
  consolidateOccurrences,
  occurrenceInstant,
} = require("../db/occurrences");
const testDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), "slotlab-occurrences-"),
);
function openDatabase(filePath) {
  return new Promise((resolve, reject) => {
    const database = new sqlite3.Database(filePath, (error) =>
      error ? reject(error) : resolve(database),
    );
  });
}
function run(database, sql, parameters = []) {
  return new Promise((resolve, reject) =>
    database.run(sql, parameters, function onRun(error) {
      if (error) reject(error);
      else resolve({ lastId: this.lastID, changes: this.changes });
    }),
  );
}
function get(database, sql, parameters = []) {
  return new Promise((resolve, reject) =>
    database.get(sql, parameters, (error, row) =>
      error ? reject(error) : resolve(row),
    ),
  );
}
function all(database, sql, parameters = []) {
  return new Promise((resolve, reject) =>
    database.all(sql, parameters, (error, rows) =>
      error ? reject(error) : resolve(rows),
    ),
  );
}
function close(database) {
  return new Promise((resolve, reject) =>
    database.close((error) => (error ? reject(error) : resolve())),
  );
}
async function fixture(t, name, capacity = 20) {
  const filePath = path.join(testDirectory, `${name}.sqlite`);
  await migrate({ databasePath: filePath });
  const database = await openDatabase(filePath);
  t.after(() => close(database));
  await run(
    database,
    `INSERT INTO buildings (id, number, name, address, latitude, longitude)
    VALUES (1, 1, 'Test', 'Test', 38, 13);`,
  );
  await run(
    database,
    `INSERT INTO spaces (id, building_id, name, floor, type, capacity, accessible, status)
    VALUES (1, 1, 'Test', 0, 'study_room', ?, 1, 'active');`,
    [capacity],
  );
  return {
    database,
    query: {
      get: (sql, values) => get(database, sql, values),
      all: (sql, values) => all(database, sql, values),
      run: (sql, values) => run(database, sql, values),
    },
  };
}
async function addAvailability(database, values = {}) {
  const slot = {
    validFrom: "2026-09-01",
    validUntil: "2026-09-30",
    weekday: 2,
    startTime: "10:00",
    endTime: "12:00",
    ...values,
  };
  return (
    await run(
      database,
      `
    INSERT INTO availabilities (space_id, valid_from, valid_until, weekday, start_time, end_time, is_retired)
    VALUES (1, ?, ?, ?, ?, ?, ?);
  `,
      [
        slot.validFrom,
        slot.validUntil,
        slot.weekday,
        slot.startTime,
        slot.endTime,
        slot.isRetired ? 1 : 0,
      ],
    )
  ).lastId;
}
async function trackFrom(database, iso) {
  await run(
    database,
    "INSERT INTO occurrence_tracking (id, tracking_started_at, consolidated_until) VALUES (1, ?, ?);",
    [iso, iso],
  );
}
after(() => fs.rmSync(testDirectory, { recursive: true, force: true }));
test("consolida anche una fascia senza prenotazioni e resta idempotente", async (t) => {
  const { database, query } = await fixture(t, "empty-slot");
  await addAvailability(database);
  await trackFrom(database, "2026-09-08T07:00:00.000Z");
  const first = await consolidateOccurrences(
    query,
    new Date("2026-09-08T09:00:00.000Z"),
  );
  assert.equal(first.finalized, 1);
  assert.deepEqual(
    await get(
      database,
      `SELECT date, start_time AS startTime, end_time AS endTime, offered_capacity AS offeredCapacity, was_offered AS wasOffered, finalized_at AS finalizedAt FROM slot_occurrences;`,
    ),
    {
      date: "2026-09-08",
      startTime: "10:00",
      endTime: "12:00",
      offeredCapacity: 20,
      wasOffered: 1,
      finalizedAt: "2026-09-08T09:00:00.000Z",
    },
  );
  const second = await consolidateOccurrences(
    query,
    new Date("2026-09-08T09:00:00.000Z"),
  );
  assert.equal(second.finalized, 0);
  assert.equal(
    (await get(database, "SELECT COUNT(*) AS count FROM slot_occurrences;"))
      .count,
    1,
  );
});
test("primo avvio: non inventa snapshot passati, completa booking derivabili e recupera un intervallo dopo il fermo", async (t) => {
  const { database, query } = await fixture(t, "first-start");
  const availabilityId = await addAvailability(database);
  await run(
    database,
    `INSERT INTO slot_occurrences(space_id,date,start_time,end_time) VALUES(1,'2026-09-08','10:00','12:00')`,
  );
  await run(
    database,
    `INSERT INTO bookings(space_id,availability_id,date,status,created_at)
    VALUES(1,?,'2026-09-08','confirmed','2026-09-01T00:00:00.000Z')`,
    [availabilityId],
  );
  const initial = await consolidateOccurrences(
    query,
    new Date("2026-09-08T13:00:00.000Z"),
  );
  assert.equal(initial.initialized, true);
  assert.equal(
    (await get(database, "SELECT status FROM bookings")).status,
    "completed",
  );
  assert.equal(
    (await get(database, "SELECT finalized_at FROM slot_occurrences"))
      .finalized_at,
    null,
  );
  await consolidateOccurrences(query, new Date("2026-09-15T13:00:00.000Z"));
  assert.equal(
    (
      await get(
        database,
        "SELECT finalized_at FROM slot_occurrences WHERE date='2026-09-08'",
      )
    ).finalized_at,
    null,
  );
  assert.equal(
    (
      await get(
        database,
        "SELECT offered_capacity FROM slot_occurrences WHERE date='2026-09-15'",
      )
    ).offered_capacity,
    20,
  );
});
test("un rollback della mutazione annulla anche snapshot e avanzamento del cursore", async (t) => {
  const { database, query } = await fixture(t, "rollback");
  await addAvailability(database);
  const cursor = "2026-09-08T07:00:00.000Z";
  await trackFrom(database, cursor);
  await run(database, "BEGIN IMMEDIATE");
  await consolidateOccurrences(query, new Date("2026-09-08T09:00:00.000Z"));
  await run(database, "ROLLBACK");
  assert.equal(
    (await get(database, "SELECT COUNT(*) AS n FROM slot_occurrences")).n,
    0,
  );
  assert.equal(
    (await get(database, "SELECT consolidated_until FROM occurrence_tracking"))
      .consolidated_until,
    cursor,
  );
});
test("mantiene la capienza consolidata anche dopo una modifica successiva", async (t) => {
  const { database, query } = await fixture(t, "capacity");
  await addAvailability(database);
  await trackFrom(database, "2026-09-08T07:00:00.000Z");
  await consolidateOccurrences(query, new Date("2026-09-08T09:00:00.000Z"));
  await run(database, "UPDATE spaces SET capacity = 30 WHERE id = 1;");
  await consolidateOccurrences(query, new Date("2026-09-08T11:00:00.000Z"));
  assert.equal(
    (
      await get(
        database,
        "SELECT offered_capacity AS offeredCapacity FROM slot_occurrences;",
      )
    ).offeredCapacity,
    20,
  );
});
test("rende persistente lo stato completed quando la fascia termina", async (t) => {
  const { database, query } = await fixture(t, "completed");
  const availabilityId = await addAvailability(database);
  await run(
    database,
    `INSERT INTO users (id, first_name, last_name, email, password_hash, role, created_at)
    VALUES (1, 'A', 'B', 'a@example.test', 'hash', 'user', '2026-09-01T00:00:00.000Z');`,
  );
  await run(
    database,
    `INSERT INTO bookings (id, space_id, availability_id, date, status, created_at)
    VALUES (1, 1, ?, '2026-09-08', 'confirmed', '2026-09-01T00:00:00.000Z');`,
    [availabilityId],
  );
  await trackFrom(database, "2026-09-08T07:00:00.000Z");
  await consolidateOccurrences(query, new Date("2026-09-08T09:00:00.000Z"));
  assert.equal(
    (await get(database, "SELECT status FROM bookings WHERE id = 1;")).status,
    "confirmed",
  );
  const result = await consolidateOccurrences(
    query,
    new Date("2026-09-08T11:00:00.000Z"),
  );
  assert.equal(result.completedBookings, 1);
  assert.equal(
    (await get(database, "SELECT status FROM bookings WHERE id = 1;")).status,
    "completed",
  );
});
test("consolida una fascia ritirata se esiste una prenotazione che ne conserva la concreta occorrenza", async (t) => {
  const { database, query } = await fixture(t, "retired-booking");
  const availabilityId = await addAvailability(database);
  await run(
    database,
    `INSERT INTO users (id, first_name, last_name, email, password_hash, role, created_at) VALUES (1, 'A', 'B', 'a@example.test', 'hash', 'user', '2026-09-01T00:00:00.000Z');`,
  );
  await run(
    database,
    `INSERT INTO bookings (id, space_id, availability_id, date, status, created_at) VALUES (1, 1, ?, '2026-09-08', 'confirmed', '2026-09-01T00:00:00.000Z');`,
    [availabilityId],
  );
  await run(
    database,
    "UPDATE availabilities SET is_retired = 1 WHERE id = ?;",
    [availabilityId],
  );
  await trackFrom(database, "2026-09-08T07:00:00.000Z");
  await consolidateOccurrences(query, new Date("2026-09-08T09:00:00.000Z"));
  assert.deepEqual(
    await get(
      database,
      "SELECT offered_capacity AS offeredCapacity, was_offered AS wasOffered FROM slot_occurrences;",
    ),
    { offeredCapacity: 20, wasOffered: 1 },
  );
});
test("segnala senza inventare il denominatore quando vecchia e nuova fascia si sovrappongono", async (t) => {
  const { database, query } = await fixture(t, "overlap");
  const oldId = await addAvailability(database, {
    startTime: "10:00",
    endTime: "12:00",
  });
  await addAvailability(database, { startTime: "10:00", endTime: "14:00" });
  await run(
    database,
    `INSERT INTO users (id, first_name, last_name, email, password_hash, role, created_at) VALUES (1, 'A', 'B', 'a@example.test', 'hash', 'user', '2026-09-01T00:00:00.000Z');`,
  );
  await run(
    database,
    `INSERT INTO bookings (id, space_id, availability_id, date, status, created_at) VALUES (1, 1, ?, '2026-09-08', 'confirmed', '2026-09-01T00:00:00.000Z');`,
    [oldId],
  );
  await run(
    database,
    "UPDATE availabilities SET is_retired = 1 WHERE id = ?;",
    [oldId],
  );
  await trackFrom(database, "2026-09-08T07:00:00.000Z");
  const result = await consolidateOccurrences(
    query,
    new Date("2026-09-08T09:00:00.000Z"),
  );
  assert.equal(result.ambiguousOccurrences, 2);
  assert.equal(
    (
      await get(
        database,
        `SELECT COUNT(*) AS count FROM occurrence_issues WHERE issue = 'overlapping_intervals';`,
      )
    ).count,
    2,
  );
  assert.equal(
    (await get(database, "SELECT COUNT(*) AS count FROM slot_occurrences;"))
      .count,
    2,
  );
});
test("registra il salto primaverile e annota l’ambiguità autunnale del calendario Roma", () => {
  assert.deepEqual(occurrenceInstant("2026-03-29", "02:30"), {
    instant: null,
    issue: "nonexistent_time",
  });
  const ambiguous = occurrenceInstant("2026-10-25", "02:30");
  assert.equal(ambiguous.issue, "ambiguous_time");
  assert.equal(ambiguous.instant.toISOString(), "2026-10-25T00:30:00.000Z");
});
test("non crea una fotografia per un orario locale inesistente e conserva il gap", async (t) => {
  const { database, query } = await fixture(t, "dst-gap");
  await addAvailability(database, {
    validFrom: "2026-03-01",
    validUntil: "2026-03-31",
    weekday: 7,
    startTime: "02:30",
    endTime: "03:30",
  });
  await trackFrom(database, "2026-03-28T00:00:00.000Z");
  const result = await consolidateOccurrences(
    query,
    new Date("2026-03-29T02:00:00.000Z"),
  );
  assert.equal(result.gapOccurrences, 1);
  assert.equal(
    (await get(database, "SELECT COUNT(*) AS count FROM slot_occurrences;"))
      .count,
    0,
  );
  assert.equal(
    (
      await get(
        database,
        `SELECT COUNT(*) AS count FROM occurrence_issues WHERE issue = 'nonexistent_time';`,
      )
    ).count,
    1,
  );
});
test("completa uno snapshot legacy lasciato non consolidato", async (t) => {
  const { database, query } = await fixture(t, "legacy-null");
  await addAvailability(database);
  await run(
    database,
    `INSERT INTO slot_occurrences (space_id, date, start_time, end_time) VALUES (1, '2026-09-08', '10:00', '12:00');`,
  );
  await trackFrom(database, "2026-09-08T07:00:00.000Z");
  await consolidateOccurrences(query, new Date("2026-09-08T09:00:00.000Z"));
  assert.deepEqual(
    await get(
      database,
      "SELECT offered_capacity AS offeredCapacity, was_offered AS wasOffered, finalized_at AS finalizedAt FROM slot_occurrences;",
    ),
    {
      offeredCapacity: 20,
      wasOffered: 1,
      finalizedAt: "2026-09-08T09:00:00.000Z",
    },
  );
});
