const { transaction } = require('../db/transaction');
const { checkPassword, assertCurrent, clearSessionCookie } = require('./account-password');
const { photoName, cleanDeletedFiles } = require('./report-files');

function romeDateTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = name => parts.find(p => p.type === name).value;
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

async function deleteAccount(request, response) {
  const user = await checkPassword(request);
  await transaction(async query => {
    await assertCurrent(query, request, user);
    const now = new Date().toISOString();
    const notifications = await query.all(`SELECT b.id, b.date, a.start_time, s.name, p.user_id
      FROM bookings b JOIN availabilities a ON a.id = b.availability_id
      JOIN spaces s ON s.id = b.space_id JOIN booking_participants p ON p.booking_id = b.id
      WHERE b.id IN (SELECT booking_id FROM booking_participants WHERE user_id = ? AND participant_role = 'organizer')
        AND p.user_id <> ? AND b.status = 'confirmed' AND b.date || ' ' || a.start_time > ?`,
    [user.id, user.id, romeDateTime()]);
    for (const item of notifications) {
      await query.run(`INSERT INTO notifications (user_id, type, title, message, created_at)
        VALUES (?, 'booking_cancelled', 'Prenotazione cancellata', ?, ?)`,
      [item.user_id, `La prenotazione presso ${item.name} del ${item.date} alle ${item.start_time} è stata cancellata per eliminazione dell'account organizzatore.`, now]);
    }
    const photos = await query.all('SELECT photo_path FROM reports WHERE user_id = ? AND photo_path IS NOT NULL', [user.id]);
    for (const photo of photos) {
      await query.run('INSERT OR IGNORE INTO file_deletions (filename, created_at) VALUES (?, ?)', [photoName(photo.photo_path), now]);
    }
    await query.run(`DELETE FROM bookings WHERE id IN
      (SELECT booking_id FROM booking_participants WHERE user_id = ? AND participant_role = 'organizer')`, [user.id]);
    await query.run('DELETE FROM users WHERE id = ?', [user.id]);
  });
  // Solo dopo il commit; eventuali errori restano nella coda per un nuovo tentativo.
  await cleanDeletedFiles().catch(() => console.error('Pulizia fotografie da riprovare.'));
  clearSessionCookie(response);
  response.status(204).end();
}

module.exports = { deleteAccount, romeDateTime };
