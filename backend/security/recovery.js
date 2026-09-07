const crypto = require('node:crypto');
const fs = require('node:fs');
const nodemailer = require('nodemailer');
const { queries, transaction } = require('../db/transaction');
const { getDatabase } = require('../db/db');
const { hashPassword } = require('./password');
const { validateEmail } = require('./validation');

function smtpConfig(env = process.env) {
  if (!env.SLOTLAB_SMTP_HOST) return null;
  const port = Number(env.SLOTLAB_SMTP_PORT || 465);
  if (!Number.isInteger(port) || port < 1 || port > 65535 ||
      !['true', 'false'].includes(env.SLOTLAB_SMTP_SECURE || 'true')) throw new Error('Configurazione SMTP non valida.');
  const from = validateEmail(env.SLOTLAB_SMTP_FROM);
  if (Boolean(env.SLOTLAB_SMTP_USER) !== Boolean(env.SLOTLAB_SMTP_PASSWORD)) throw new Error('Credenziali SMTP incomplete.');
  return { from, transport: {
    host: env.SLOTLAB_SMTP_HOST, port, secure: (env.SLOTLAB_SMTP_SECURE || 'true') === 'true',
    requireTLS: true, connectionTimeout: 4000, greetingTimeout: 4000, socketTimeout: 4000,
    auth: env.SLOTLAB_SMTP_USER ? { user: env.SLOTLAB_SMTP_USER, pass: env.SLOTLAB_SMTP_PASSWORD } : undefined,
    tls: env.SLOTLAB_SMTP_CA_FILE ? { ca: fs.readFileSync(env.SLOTLAB_SMTP_CA_FILE) } : undefined,
    disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false,
  } };
}

async function recoverPassword(email) {
  const config = smtpConfig();
  if (!config) throw new Error('SMTP non configurato.');
  const user = await queries(getDatabase()).get('SELECT id, password_hash FROM users WHERE email = ?', [email]);
  if (!user) return;
  const password = `Aa1!${crypto.randomBytes(24).toString('base64url')}`;
  const hash = await hashPassword(password);
  const transport = nodemailer.createTransport(config.transport);
  try {
    await transaction(async query => {
      const current = await query.get('SELECT id FROM users WHERE id = ? AND password_hash = ?', [user.id, user.password_hash]);
      if (!current) return;
      await query.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
      await query.run('DELETE FROM auth_sessions WHERE user_id = ?', [user.id]);
      const result = await transport.sendMail({ from: config.from, to: { address: email },
        subject: 'SlotLab — Recupero password',
        text: `È stata richiesta una nuova password per il tuo account SlotLab.\n\nNuova password: ${password}\n\nAccedi nuovamente a SlotLab. Puoi modificarla dal profilo.`,
      });
      if (result.rejected.length || !result.accepted.length) throw new Error('Invio SMTP rifiutato.');
    });
  } finally { transport.close(); }
}

// Risposta HTTP immediata e uniforme: tempi SMTP ed esistenza account non emergono al client.
// Coda breve in memoria, senza password salvate. Dopo un arresto inatteso si puo riprovare.
let queue = Promise.resolve();
const pending = new Set();
function requestRecovery(email) {
  if (pending.has(email)) return true;
  if (pending.size >= 32) return false;
  pending.add(email);
  queue = queue.then(() => recoverPassword(email)).catch(() => {
    console.error('Recupero password non completato. Verificare SMTP e database; nessun dato account viene registrato.');
  }).finally(() => pending.delete(email));
  return true;
}
function waitForRecovery() { return queue; }

module.exports = { smtpConfig, recoverPassword, requestRecovery, waitForRecovery };
