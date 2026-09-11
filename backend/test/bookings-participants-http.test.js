const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { before, after, test } = require("node:test");
const directory = fs.mkdtempSync(
  path.join(os.tmpdir(), "slotlab-bookings-participants-"),
);
process.env.SLOTLAB_DB_PATH = path.join(directory, "test.sqlite");
process.env.NODE_ENV = "test";
process.env.HOST = "127.0.0.1";
process.env.PORT = "0";
process.env.SLOTLAB_JWT_SECRET = crypto.randomBytes(32).toString("hex");
const { startServer, stopServer } = require("../server");
const { getDatabase } = require("../db/db");
const { queries } = require("../db/transaction");
const { hashPassword } = require("../security/password");
const { romeNow } = require("../domain/time");
let base;
let db;
const password = "ParticipantsFixture2026!";
const accounts = {};
async function request(url, method = "GET", body, token) {
  const response = await fetch(`${base}/api/v1${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(method === "POST" && url === "/bookings"
        ? { "Idempotency-Key": `participants-${Date.now()}-${Math.random()}` }
        : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    status: response.status,
    body: response.status === 204 ? null : await response.json(),
  };
}
function futureDate() {
  const date = new Date(Date.now() + 8 * 86400000);
  return date.toISOString().slice(0, 10);
}
function shortlyAfterNow() {
  const local = romeNow();
  const [hours, minutes] = local.time.split(":").map(Number);
  const minute = hours * 60 + minutes;
  if (minute <= 23 * 60 + 57) {
    const start = minute + 1;
    const end = start + 1;
    return {
      date: local.date,
      startTime: `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`,
      endTime: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
    };
  }
  const tomorrow = new Date(`${local.date}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return {
    date: tomorrow.toISOString().slice(0, 10),
    startTime: "00:01",
    endTime: "01:00",
  };
}
before(async () => {
  const server = await startServer();
  base = `http://127.0.0.1:${server.address().port}`;
  db = queries(getDatabase());
  const building = await db.run(
    `INSERT INTO buildings(number,name,address,latitude,longitude) VALUES(?,?,?,?,?)`,
    [991, "Edificio partecipanti", "Ambiente di test", 38, 13],
  );
  const space = await db.run(
    `INSERT INTO spaces(building_id,name,floor,type,capacity,accessible,status) VALUES(?,?,0,'study_room',8,1,'active')`,
    [building.lastId, "Aula partecipanti"],
  );
  const date = futureDate();
  const availability = await db.run(
    `INSERT INTO availabilities(space_id,valid_from,valid_until,weekday,start_time,end_time,is_retired) VALUES(?,?,?,?,?,?,0)`,
    [
      space.lastId,
      date,
      date,
      new Date(`${date}T12:00:00Z`).getUTCDay() || 7,
      "10:00",
      "12:00",
    ],
  );
  const laterAvailability = await db.run(
    `INSERT INTO availabilities(space_id,valid_from,valid_until,weekday,start_time,end_time,is_retired) VALUES(?,?,?,?,?,?,0)`,
    [
      space.lastId,
      date,
      date,
      new Date(`${date}T12:00:00Z`).getUTCDay() || 7,
      "14:00",
      "16:00",
    ],
  );
  const passwordHash = await hashPassword(password);
  for (const [key, email] of Object.entries({
    organizer: "organizer-participants@test.example",
    invitee: "invitee-participants@test.example",
    second: "second-participants@test.example",
  })) {
    await db.run(
      `INSERT INTO users(first_name,last_name,email,password_hash,role,created_at) VALUES(?,?,?,?, 'user',?)`,
      [key, "Participants", email, passwordHash, new Date().toISOString()],
    );
    const login = await request("/auth/login", "POST", { email, password });
    assert.equal(login.status, 200);
    accounts[key] = login.body.data;
  }
  accounts.spaceId = space.lastId;
  accounts.availabilityId = availability.lastId;
  accounts.laterAvailabilityId = laterAvailability.lastId;
  accounts.date = date;
});
after(async () => {
  await stopServer();
  fs.rmSync(directory, { recursive: true, force: true });
});
test("la Home restituisce la stessa prenotazione a creatore e partecipanti, senza duplicati", async () => {
  const booking = await request(
    "/bookings",
    "POST",
    {
      spaceId: accounts.spaceId,
      availabilityId: accounts.availabilityId,
      date: accounts.date,
      participantEmails: [
        "invitee-participants@test.example",
        "second-participants@test.example",
      ],
    },
    accounts.organizer.accessToken,
  );
  assert.equal(booking.status, 201);
  const bookingId = booking.body.data.id;
  for (const account of [
    accounts.organizer,
    accounts.invitee,
    accounts.second,
  ]) {
    const home = await request(
      "/bookings",
      "GET",
      undefined,
      account.accessToken,
    );
    assert.equal(home.status, 200);
    assert.equal(home.body.data.length, 1);
    assert.equal(home.body.data[0].id, bookingId);
    assert.equal(home.body.data[0].participantCount, 3);
    assert.equal(home.body.data[0].spaceName, "Aula partecipanti");
  }
  const duplicateEmails = await request(
    "/bookings",
    "POST",
    {
      spaceId: accounts.spaceId,
      availabilityId: accounts.availabilityId,
      date: accounts.date,
      participantEmails: [
        "invitee-participants@test.example",
        "invitee-participants@test.example",
      ],
    },
    accounts.organizer.accessToken,
  );
  assert.equal(duplicateEmails.status, 409);
  assert.equal(duplicateEmails.body.error.code, "DUPLICATE_PARTICIPANT");
  const duplicateParticipant = await request(
    `/bookings/${bookingId}/participants`,
    "POST",
    { email: "invitee-participants@test.example" },
    accounts.organizer.accessToken,
  );
  assert.equal(duplicateParticipant.status, 409);
  assert.equal(duplicateParticipant.body.error.code, "DUPLICATE_PARTICIPANT");
  const laterBooking = await request(
    "/bookings",
    "POST",
    {
      spaceId: accounts.spaceId,
      availabilityId: accounts.laterAvailabilityId,
      date: accounts.date,
      participantEmails: [],
    },
    accounts.organizer.accessToken,
  );
  assert.equal(laterBooking.status, 201);
  const ordered = await request(
    "/bookings",
    "GET",
    undefined,
    accounts.organizer.accessToken,
  );
  assert.equal(ordered.status, 200);
  assert.deepEqual(
    ordered.body.data.map((item) => item.id),
    [bookingId, laterBooking.body.data.id],
  );
  assert.deepEqual(
    ordered.body.data.map((item) => item.startTime),
    ["10:00", "14:00"],
  );
});
test("annullamento oltre un’ora elimina gruppo e richiesta, notifica gli altri e sparisce dagli elenchi", async () => {
  const date = new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10);
  const availability = await db.run(
    `INSERT INTO availabilities(space_id,valid_from,valid_until,weekday,start_time,end_time,is_retired)
     VALUES(?,?,?,?,?,?,0)`,
    [
      accounts.spaceId,
      date,
      date,
      new Date(`${date}T12:00:00Z`).getUTCDay() || 7,
      "10:00",
      "12:00",
    ],
  );
  const created = await request(
    "/bookings",
    "POST",
    {
      spaceId: accounts.spaceId,
      availabilityId: availability.lastId,
      date,
      participantEmails: ["invitee-participants@test.example"],
    },
    accounts.organizer.accessToken,
  );
  assert.equal(created.status, 201);
  const bookingId = created.body.data.id;
  const noticesBefore = (
    await db.get(
      "SELECT COUNT(*) AS count FROM notifications WHERE user_id=? AND type='booking_cancelled'",
      [accounts.invitee.user.id],
    )
  ).count;
  const cancelled = await request(
    `/bookings/${bookingId}`,
    "DELETE",
    undefined,
    accounts.organizer.accessToken,
  );
  assert.equal(cancelled.status, 204);
  assert.equal(
    await db.get("SELECT id FROM bookings WHERE id=?", [bookingId]),
    undefined,
  );
  assert.equal(
    (
      await db.get(
        "SELECT COUNT(*) AS count FROM booking_participants WHERE booking_id=?",
        [bookingId],
      )
    ).count,
    0,
  );
  assert.equal(
    (
      await db.get(
        "SELECT booking_id AS bookingId FROM booking_requests WHERE booking_id IS NULL AND user_id=? ORDER BY id DESC LIMIT 1",
        [accounts.organizer.user.id],
      )
    ).bookingId,
    null,
  );
  assert.equal(
    (
      await db.get(
        "SELECT COUNT(*) AS count FROM notifications WHERE user_id=? AND type='booking_cancelled'",
        [accounts.invitee.user.id],
      )
    ).count,
    noticesBefore + 1,
  );
  for (const account of [accounts.organizer, accounts.invitee]) {
    const visible = await request(
      "/bookings",
      "GET",
      undefined,
      account.accessToken,
    );
    assert.equal(
      visible.body.data.some((item) => item.id === bookingId),
      false,
    );
  }
});
test("entro un’ora aggiunta, rimozione, abbandono e annullamento sono bloccati atomicamente", async () => {
  const slot = shortlyAfterNow();
  const availability = await db.run(
    `INSERT INTO availabilities(space_id,valid_from,valid_until,weekday,start_time,end_time,is_retired)
     VALUES(?,?,?,?,?,?,0)`,
    [
      accounts.spaceId,
      slot.date,
      slot.date,
      new Date(`${slot.date}T12:00:00Z`).getUTCDay() || 7,
      slot.startTime,
      slot.endTime,
    ],
  );
  const booking = await db.run(
    "INSERT INTO bookings(space_id,availability_id,date,status,created_at) VALUES(?,?,?,'confirmed',?)",
    [
      accounts.spaceId,
      availability.lastId,
      slot.date,
      new Date().toISOString(),
    ],
  );
  const organizer = await db.run(
    "INSERT INTO booking_participants(booking_id,user_id,participant_role) VALUES(?,?,'organizer')",
    [booking.lastId, accounts.organizer.user.id],
  );
  const invitee = await db.run(
    "INSERT INTO booking_participants(booking_id,user_id,participant_role) VALUES(?,?,'participant')",
    [booking.lastId, accounts.invitee.user.id],
  );
  const notificationsBefore = (
    await db.get("SELECT COUNT(*) AS count FROM notifications")
  ).count;
  const attempts = [
    await request(
      `/bookings/${booking.lastId}/participants`,
      "POST",
      { email: "second-participants@test.example" },
      accounts.organizer.accessToken,
    ),
    await request(
      `/bookings/${booking.lastId}/participants/${invitee.lastId}`,
      "DELETE",
      undefined,
      accounts.organizer.accessToken,
    ),
    await request(
      `/bookings/${booking.lastId}/participants/${invitee.lastId}`,
      "DELETE",
      undefined,
      accounts.invitee.accessToken,
    ),
    await request(
      `/bookings/${booking.lastId}`,
      "DELETE",
      undefined,
      accounts.organizer.accessToken,
    ),
  ];
  for (const attempt of attempts) {
    assert.equal(attempt.status, 409);
    assert.equal(attempt.body.error.code, "BOOKING_DEADLINE_EXPIRED");
  }
  assert.ok(
    await db.get("SELECT id FROM bookings WHERE id=?", [booking.lastId]),
  );
  assert.equal(
    (
      await db.get(
        "SELECT COUNT(*) AS count FROM booking_participants WHERE booking_id=?",
        [booking.lastId],
      )
    ).count,
    2,
  );
  assert.ok(
    await db.get("SELECT id FROM booking_participants WHERE id=?", [
      organizer.lastId,
    ]),
  );
  assert.ok(
    await db.get("SELECT id FROM booking_participants WHERE id=?", [
      invitee.lastId,
    ]),
  );
  assert.equal(
    (await db.get("SELECT COUNT(*) AS count FROM notifications")).count,
    notificationsBefore,
  );
});
test("il boundary HTTP blocca T-60 esatto e consente un millisecondo oltre l’ora", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-09-12T07:59:59.000Z"),
  });
  const login = await request("/auth/login", "POST", {
    email: "organizer-participants@test.example",
    password,
  });
  assert.equal(login.status, 200);
  const availability = await db.run(
    `INSERT INTO availabilities(space_id,valid_from,valid_until,weekday,start_time,end_time,is_retired)
     VALUES(?,'2026-09-12','2026-09-12',6,'11:00','12:00',0)`,
    [accounts.spaceId],
  );
  const booking = await db.run(
    "INSERT INTO bookings(space_id,availability_id,date,status,created_at) VALUES(?,?,'2026-09-12','confirmed',?)",
    [accounts.spaceId, availability.lastId, new Date().toISOString()],
  );
  await db.run(
    "INSERT INTO booking_participants(booking_id,user_id,participant_role) VALUES(?,?,'organizer')",
    [booking.lastId, accounts.organizer.user.id],
  );
  t.mock.timers.setTime(new Date("2026-09-12T08:00:00.000Z").getTime());
  const exact = await request(
    `/bookings/${booking.lastId}`,
    "DELETE",
    undefined,
    login.body.data.accessToken,
  );
  assert.equal(exact.status, 409);
  assert.equal(exact.body.error.code, "BOOKING_DEADLINE_EXPIRED");
  assert.ok(
    await db.get("SELECT id FROM bookings WHERE id=?", [booking.lastId]),
  );
  t.mock.timers.setTime(new Date("2026-09-12T07:59:59.999Z").getTime());
  const justBefore = await request(
    `/bookings/${booking.lastId}`,
    "DELETE",
    undefined,
    login.body.data.accessToken,
  );
  assert.equal(justBefore.status, 204);
  assert.equal(
    await db.get("SELECT id FROM bookings WHERE id=?", [booking.lastId]),
    undefined,
  );
});
