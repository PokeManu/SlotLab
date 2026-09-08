const assert = require('node:assert/strict');
const { test, before, after, beforeEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const tls = require('node:tls');
const { execFileSync } = require('node:child_process');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'slotlab-account-'));
Object.assign(process.env, { NODE_ENV: 'test', PORT: '0', HOST: '127.0.0.1',
  SLOTLAB_DB_PATH: path.join(directory, 'db.sqlite'), SLOTLAB_UPLOAD_DIR: path.join(directory, 'photos'),
  SLOTLAB_JWT_SECRET: crypto.randomBytes(32).toString('hex') });
const { startServer, stopServer } = require('../server');
const { getDatabase } = require('../db/db');
const { queries } = require('../db/transaction');
const { waitForRecovery } = require('../security/recovery');
const { cleanDeletedFiles } = require('../security/report-files');
const { rateLimit, resetRateLimits } = require('../middleware/rate-limit');
let base, smtp, query, sequence = 0, rejectMail = false;
const messages = [];
const password = 'AccountTest2026!';

async function request(method, endpoint, body, token, cookie) {
  const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie, 'X-SlotLab-Request': '1' } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: response.status === 204 ? null : await response.json(), cookie: response.headers.get('set-cookie') };
}
async function account() {
  const email = `account${++sequence}@example.test`;
  const created = await request('POST', '/auth/register', { firstName: 'Account', lastName: 'Test', email, password });
  assert.equal(created.status, 201);
  const login = await request('POST', '/auth/login', { email, password });
  return { id: created.body.data.id, email, token: login.body.data.accessToken, cookie: login.cookie.split(';')[0] };
}
before(async () => {
  fs.mkdirSync(process.env.SLOTLAB_UPLOAD_DIR);
  const key = path.join(directory, 'smtp-key.pem'), cert = path.join(directory, 'smtp-cert.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost', '-keyout', key, '-out', cert], { stdio: 'ignore' });
  smtp = tls.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, socket => {
    socket.on('error', () => {});
    socket.write('220 localhost test SMTP\r\n');
    let buffer = '', data = false, message = '';
    socket.on('data', chunk => {
      buffer += chunk.toString();
      while (buffer.includes('\r\n')) {
        const end = buffer.indexOf('\r\n'), line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        if (data) {
          if (line === '.') { messages.push(message); message = ''; data = false; socket.write('250 Accepted\r\n'); }
          else message += line + '\n';
        } else if (/^(EHLO|HELO)/.test(line)) socket.write('250-localhost\r\n250 SIZE 100000\r\n');
        else if (line === 'DATA') { data = true; socket.write('354 Send data\r\n'); }
        else if (line === 'QUIT') socket.end('221 Bye\r\n');
        else socket.write(rejectMail && line.startsWith('RCPT') ? '550 Rejected\r\n' : '250 OK\r\n');
      }
    });
  });
  await new Promise(resolve => smtp.listen(0, '127.0.0.1', resolve));
  Object.assign(process.env, { SLOTLAB_SMTP_HOST: 'localhost', SLOTLAB_SMTP_PORT: String(smtp.address().port),
    SLOTLAB_SMTP_SECURE: 'true', SLOTLAB_SMTP_FROM: 'slotlab@example.test', SLOTLAB_SMTP_CA_FILE: cert });
  const server = await startServer();
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
  query = queries(getDatabase());
});
beforeEach(() => { resetRateLimits(); rejectMail = false; });
after(async () => { await stopServer(); await new Promise(resolve => smtp.close(resolve)); fs.rmSync(directory, { recursive: true }); });

test('cambio password: controlli, revoca JWT/refresh e nuovo login', async () => {
  const user = await account();
  assert.equal((await request('PATCH', '/users/me/password', { currentPassword: 'wrong', newPassword: 'Changed2026!' }, user.token)).body.error.code, 'CURRENT_PASSWORD_INVALID');
  assert.equal((await request('PATCH', '/users/me/password', { currentPassword: password, newPassword: 'weak' }, user.token)).body.error.code, 'INVALID_PASSWORD_FORMAT');
  const result = await request('PATCH', '/users/me/password', { currentPassword: password, newPassword: 'Changed2026!' }, user.token);
  assert.equal(result.status, 204); assert.match(result.cookie, /HttpOnly/); assert.match(result.cookie, /Secure/);
  assert.equal((await request('GET', '/users/me', undefined, user.token)).status, 401);
  assert.equal((await request('POST', '/auth/refresh', {}, null, user.cookie)).status, 401);
  assert.equal((await request('POST', '/auth/login', { email: user.email, password })).status, 401);
  assert.equal((await request('POST', '/auth/login', { email: user.email, password: 'Changed2026!' })).status, 200);
});

test('due cambi concorrenti: soltanto uno modifica la password', async () => {
  const user = await account();
  const results = await Promise.all(['Changed2026!', 'Different2026!'].map(newPassword => request('PATCH', '/users/me/password', { currentPassword: password, newPassword }, user.token)));
  assert.equal(results.filter(result => result.status === 204).length, 1);
  assert.ok(results.some(result => [400, 401].includes(result.status)));
});

test('errore durante la revoca annulla anche il cambio hash', async () => {
  const user = await account();
  const before = await query.get('SELECT password_hash FROM users WHERE id = ?', [user.id]);
  await query.run(`CREATE TRIGGER fail_session_delete BEFORE DELETE ON auth_sessions BEGIN SELECT RAISE(ABORT, 'test'); END`);
  try {
    const result = await request('PATCH', '/users/me/password', { currentPassword: password, newPassword: 'Changed2026!' }, user.token);
    assert.equal(result.status, 500); assert.equal(result.cookie, null);
    assert.deepEqual(await query.get('SELECT password_hash FROM users WHERE id = ?', [user.id]), before);
  } finally { await query.run('DROP TRIGGER fail_session_delete'); }
});

test('recupero SMTP TLS: 204 uniforme, password casuale conforme, hash e revoca', async () => {
  const user = await account();
  const count = messages.length;
  assert.equal((await request('POST', '/auth/forgot-password', { email: 'unknown@example.test' })).status, 204);
  const recovery = await request('POST', '/auth/forgot-password', { email: user.email });
  assert.equal(recovery.status, 204);
  assert.match(recovery.cookie, /slotlab_refresh=/);
  assert.match(recovery.cookie, /Expires=Thu, 01 Jan 1970 00:00:00 GMT/);
  await waitForRecovery();
  assert.equal(messages.length, count + 1);
  // Il server SMTP e locale e il messaggio resta soltanto in memoria nel test.
  const decoded = messages.at(-1).replace(/=\n/g, '').replace(/=([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  const generated = /Nuova password: ([^\s]+)/.exec(decoded)[1];
  require('../security/validation').validatePassword(generated);
  assert.equal((await request('GET', '/users/me', undefined, user.token)).status, 401);
  assert.equal((await request('POST', '/auth/login', { email: user.email, password: generated })).status, 200);
  const stored = await query.get('SELECT password_hash FROM users WHERE id = ?', [user.id]);
  assert.ok(stored.password_hash.startsWith('scrypt$')); assert.notEqual(stored.password_hash, generated);
});

test('errore SMTP: 204 uniforme, password e sessione precedenti conservate', async () => {
  const user = await account(); rejectMail = true;
  const before = await query.get('SELECT password_hash FROM users WHERE id = ?', [user.id]);
  assert.equal((await request('POST', '/auth/forgot-password', { email: user.email })).status, 204);
  await waitForRecovery();
  assert.deepEqual(await query.get('SELECT password_hash FROM users WHERE id = ?', [user.id]), before);
  assert.equal((await request('GET', '/users/me', undefined, user.token)).status, 200);
});

test('cancellazione: organizzatore/storico/partecipante, notifiche, foto e idempotenza', async () => {
  const owner = await account(), other = await account();
  const createdAt = new Date().toISOString();
  const building = await query.run("INSERT INTO buildings(number,name,address,latitude,longitude) VALUES(1,'Edificio','Campus',38,13)");
  const space = await query.run("INSERT INTO spaces(building_id,name,floor,type,capacity,accessible,status) VALUES(?,'Spazio',0,'study_room',20,1,'active')", [building.lastId]);
  const availability = await query.run("INSERT INTO availabilities(space_id,valid_from,valid_until,weekday,start_time,end_time) VALUES(?,'2020-01-01','2099-12-31',1,'10:00','12:00')", [space.lastId]);
  const bookings = [];
  for (const [date, status, organizer] of [['2099-01-01','confirmed',owner.id], ['2020-01-01','completed',owner.id], ['2099-01-02','confirmed',other.id]]) {
    const booking = await query.run('INSERT INTO bookings(space_id,availability_id,date,status,created_at) VALUES(?,?,?,?,?)', [space.lastId, availability.lastId, date, status, createdAt]);
    bookings.push(booking.lastId);
    for (const id of [owner.id, other.id]) await query.run('INSERT INTO booking_participants(booking_id,user_id,participant_role) VALUES(?,?,?)', [booking.lastId,id,id === organizer ? 'organizer':'participant']);
  }
  await query.run("INSERT INTO booking_requests(user_id,idempotency_key,request_hash,booking_id,created_at) VALUES(?,'key','hash',?,?)", [other.id,bookings[0],createdAt]);
  await query.run('INSERT INTO favorites(user_id,space_id,created_at) VALUES(?,?,?)',[owner.id,space.lastId,createdAt]);
  fs.writeFileSync(path.join(process.env.SLOTLAB_UPLOAD_DIR,'test-photo.png'), 'test-only');
  await query.run("INSERT INTO reports(user_id,space_id,category,description,priority,status,photo_path,created_at,updated_at) VALUES(?,?,'other','Prova','low','open','test-photo.png',?,?)",[owner.id,space.lastId,createdAt,createdAt]);
  assert.equal((await request('DELETE','/users/me',{currentPassword:'wrong'},owner.token)).status,400);
  await query.run(`CREATE TRIGGER rollback_account BEFORE DELETE ON users BEGIN SELECT RAISE(ABORT,'test'); END`);
  try {
    assert.equal((await request('DELETE','/users/me',{currentPassword:password},owner.token)).status,500);
    assert.equal((await query.all('SELECT id FROM bookings WHERE id IN (?,?,?)',bookings)).length,3);
    assert.equal((await query.all('SELECT id FROM notifications WHERE user_id=?',[other.id])).length,0);
    assert.equal(fs.existsSync(path.join(process.env.SLOTLAB_UPLOAD_DIR,'test-photo.png')),true);
    assert.equal((await query.all('SELECT * FROM file_deletions')).length,0);
  } finally { await query.run('DROP TRIGGER rollback_account'); }
  const result=await request('DELETE','/users/me',{currentPassword:password},owner.token);
  assert.equal(result.status,204);
  assert.equal(await query.get('SELECT id FROM users WHERE id=?',[owner.id]),undefined);
  assert.equal((await query.all('SELECT id FROM bookings WHERE id IN (?,?,?)',bookings)).length,1);
  assert.equal((await query.all('SELECT * FROM booking_participants WHERE booking_id=?',[bookings[2]])).length,1);
  assert.equal((await query.all('SELECT * FROM notifications WHERE user_id=?',[other.id])).length,1);
  assert.equal((await query.get('SELECT booking_id FROM booking_requests WHERE user_id=?',[other.id])).booking_id,null);
  assert.equal(fs.existsSync(path.join(process.env.SLOTLAB_UPLOAD_DIR,'test-photo.png')),false);
  assert.deepEqual(await query.all('PRAGMA foreign_key_check'),[]);
});

test('cancellazione fallita fa rollback; admin non puo eliminarsi', async () => {
  const user=await account();
  await query.run(`CREATE TRIGGER fail_user_delete BEFORE DELETE ON users BEGIN SELECT RAISE(ABORT,'test'); END`);
  try { assert.equal((await request('DELETE','/users/me',{currentPassword:password},user.token)).status,500); }
  finally { await query.run('DROP TRIGGER fail_user_delete'); }
  assert.equal((await request('GET','/users/me',undefined,user.token)).status,200);
  await query.run("UPDATE users SET role='admin' WHERE id=?",[user.id]);
  const login=await request('POST','/auth/login',{email:user.email,password});
  assert.equal((await request('DELETE','/users/me',{currentPassword:password},login.body.data.accessToken)).status,403);
});

test('pulizia foto persistente: errore ritentabile e traversal bloccato', async () => {
  const root=process.env.SLOTLAB_UPLOAD_DIR;
  fs.mkdirSync(path.join(root,'retry.png'));
  await query.run("INSERT INTO file_deletions VALUES('retry.png',?)",[new Date().toISOString()]);
  await cleanDeletedFiles();
  assert.ok(await query.get("SELECT * FROM file_deletions WHERE filename='retry.png'"));
  fs.rmdirSync(path.join(root,'retry.png'));
  await cleanDeletedFiles();
  assert.equal(await query.get("SELECT * FROM file_deletions WHERE filename='retry.png'"),undefined);
  assert.throws(()=>require('../security/report-files').photoName('../secret.png'));
});

test('rate limiter: soglia, Retry-After, scadenza e memoria limitata', () => {
  let now=0, calls=0, status;
  const headers={}; const response={set:(k,v)=>headers[k]=v,status:value=>{status=value;return response;},json:()=>{}};
  const limiter=rateLimit({limit:2,windowMs:1000,maxKeys:1,now:()=>now});
  const next=()=>calls++;
  limiter({ip:'one'},response,next);limiter({ip:'one'},response,next);limiter({ip:'one'},response,next);
  assert.equal(calls,2);assert.equal(status,429);assert.equal(headers['Retry-After'],'1');
  limiter({ip:'two'},response,next);assert.equal(calls,2);
  now=1001;limiter({ip:'two'},response,next);assert.equal(calls,3);
});
