// Massimo dei posti impegnati contemporaneamente nell'intervallo richiesto.
// Include le prenotazioni riferite a configurazioni ritirate.
async function occupiedSeats(db, spaceId, date, startTime, endTime) {
  const rows = await db.all(
    `SELECT a.start_time AS startTime, a.end_time AS endTime, COUNT(bp.id) AS seats
       FROM bookings b JOIN availabilities a ON a.id=b.availability_id
       JOIN booking_participants bp ON bp.booking_id=b.id
      WHERE b.space_id=? AND b.date=? AND b.status='confirmed'
        AND a.start_time < ? AND a.end_time > ?
      GROUP BY b.id;`, [spaceId, date, endTime, startTime],
  );
  const events = [];
  for (const row of rows) {
    events.push({ time: row.startTime < startTime ? startTime : row.startTime, change: row.seats });
    events.push({ time: row.endTime > endTime ? endTime : row.endTime, change: -row.seats });
  }
  events.sort((a,b) => a.time.localeCompare(b.time) || a.change-b.change);
  let current = 0, peak = 0;
  for (const event of events) { current += event.change; peak = Math.max(peak,current); }
  return peak;
}
module.exports = { occupiedSeats };
