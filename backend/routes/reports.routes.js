const express = require('express');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { getDatabase } = require('../db/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { transaction } = require('../db/transaction');

const router = express.Router();
router.use(requireAuth, requireRole('user'));
const spaceReportsRouter = express.Router();
spaceReportsRouter.use('/spaces', requireAuth, requireRole('user'));

function query(sql, values = []) {
  return new Promise((resolve, reject) => getDatabase().all(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));
}

function get(sql, values = []) {
  return new Promise((resolve, reject) => getDatabase().get(sql, values, (error, row) => error ? reject(error) : resolve(row)));
}

function reportId(value) {
  if (!/^[1-9][0-9]*$/.test(String(value))) throw Object.assign(new Error('Identificativo segnalazione non valido.'), { status: 400, code: 'INVALID_REPORT_ID' });
  return Number(value);
}

function mapReport(row) {
  return { id: row.id, spaceId: row.spaceId, spaceName: row.spaceName, category: row.category,
    description: row.description, priority: row.priority, status: row.status, photo: row.photoPath,
    createdAt: row.createdAt, updatedAt: row.updatedAt };
}

function parseMultipart(request) {
  return new Promise((resolve, reject) => {
    const match = /^multipart\/form-data;\s*boundary=(?:"([^"]+)"|([^;]+))$/i.exec(request.get('Content-Type') || '');
    if (!match) return reject(Object.assign(new Error('La segnalazione richiede multipart/form-data.'), { status: 415, code: 'UNSUPPORTED_MEDIA_TYPE' }));
    const boundary = Buffer.from(`--${match[1] || match[2]}`);
    const chunks = [];
    let total = 0;
    request.on('data', chunk => {
      total += chunk.length;
      if (total > 5 * 1024 * 1024 + 65536) {
        request.destroy();
        reject(Object.assign(new Error('La richiesta supera il limite consentito.'), { status: 413, code: 'PHOTO_TOO_LARGE' }));
        return;
      }
      chunks.push(chunk);
    });
    request.on('error', reject);
    request.on('end', () => {
      const body = Buffer.concat(chunks);
      const fields = {};
      let photo = null;
      for (const part of body.toString('latin1').split(boundary.toString('latin1')).slice(1)) {
        if (part.startsWith('--')) continue;
        const content = Buffer.from(part.replace(/^\r\n|\r\n$/g, ''), 'latin1');
        const separator = content.indexOf('\r\n\r\n');
        if (separator < 0) continue;
        const headers = content.subarray(0, separator).toString('latin1');
        const value = content.subarray(separator + 4);
        const disposition = /name="([^"]+)"(?:;\s*filename="([^"]*)")?/i.exec(headers);
        if (!disposition) continue;
        if (disposition[2] !== undefined) photo = { filename: disposition[2], contentType: /content-type:\s*([^\r\n]+)/i.exec(headers)?.[1]?.trim() || '', data: value };
        else fields[disposition[1]] = value.toString('utf8');
      }
      resolve({ fields, photo });
    });
  });
}

function photoFormat(photo) {
  if (!photo) return null;
  if (photo.data.length > 5 * 1024 * 1024) throw Object.assign(new Error('La foto supera 5 MB.'), { status: 413, code: 'PHOTO_TOO_LARGE' });
  if (photo.data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpg';
  if (photo.data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (photo.data.subarray(0, 4).toString() === 'RIFF' && photo.data.subarray(8, 12).toString() === 'WEBP') return 'webp';
  throw Object.assign(new Error('Il formato della foto non è valido.'), { status: 415, code: 'INVALID_PHOTO_FORMAT' });
}

const select = `SELECT r.id, r.space_id AS spaceId, s.name AS spaceName, r.category, r.description,
                       r.priority, r.status, r.photo_path AS photoPath, r.created_at AS createdAt,
                       r.updated_at AS updatedAt
                  FROM reports r JOIN spaces s ON s.id = r.space_id`;

router.get('/', async (request, response) => {
  const page = request.query.page === undefined ? 1 : Number(request.query.page);
  const size = request.query.size === undefined ? 20 : Number(request.query.size);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(size) || size < 1 || size > 100) {
    throw Object.assign(new Error('I parametri di paginazione non sono validi.'), { status: 400, code: 'VALIDATION_ERROR' });
  }
  const total = await get('SELECT COUNT(*) AS count FROM reports WHERE user_id = ?;', [request.user.id]);
  const rows = await query(`${select} WHERE r.user_id = ? ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?;`, [request.user.id, size, (page - 1) * size]);
  response.json({ data: rows.map(mapReport), pagination: { page, size, totalElements: total.count, totalPages: Math.ceil(total.count / size) } });
});

router.get('/:reportId', async (request, response) => {
  const id = reportId(request.params.reportId);
  const row = await get(`${select} WHERE r.id = ? AND r.user_id = ?;`, [id, request.user.id]);
  if (!row) throw Object.assign(new Error('La segnalazione richiesta non esiste.'), { status: 404, code: 'REPORT_NOT_FOUND' });
  response.json({ data: mapReport(row) });
});

spaceReportsRouter.post('/spaces/:spaceId/reports', async (request, response) => {
  if (!/^[1-9][0-9]*$/.test(request.params.spaceId)) throw Object.assign(new Error('Identificativo spazio non valido.'), { status: 400, code: 'INVALID_SPACE_ID' });
  const spaceId = Number(request.params.spaceId);
  const { fields, photo } = await parseMultipart(request);
  const category = fields.category;
  const description = typeof fields.description === 'string' ? fields.description.trim() : '';
  const priorities = { technical: 'high', accessibility: 'high', cleaning: 'medium', other: 'low' };
  if (!Object.hasOwn(priorities, category)) throw Object.assign(new Error('La categoria non è valida.'), { status: 400, code: 'INVALID_REPORT_CATEGORY' });
  if (!description) throw Object.assign(new Error('La descrizione è obbligatoria.'), { status: 400, code: 'VALIDATION_ERROR' });
  const extension = photoFormat(photo);
  const space = await get('SELECT id FROM spaces WHERE id = ?;', [spaceId]);
  if (!space) throw Object.assign(new Error('Lo spazio richiesto non esiste.'), { status: 404, code: 'SPACE_NOT_FOUND' });
  const filename = extension ? `${crypto.randomUUID()}.${extension}` : null;
  const uploadRoot = process.env.SLOTLAB_UPLOAD_DIR || path.join(__dirname, '..', 'uploads', 'reports');
  if (!path.isAbsolute(uploadRoot)) throw new Error('La cartella foto deve essere assoluta.');
  let saved = false;
  try {
    if (filename) { await fs.mkdir(uploadRoot, { recursive: true }); await fs.writeFile(path.join(uploadRoot, filename), photo.data, { flag: 'wx' }); saved = true; }
    const createdAt = new Date().toISOString();
    const row = await transaction(async db => {
      const result = await db.run(
        `INSERT INTO reports (user_id, space_id, category, description, priority, status, photo_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?);`,
        [request.user.id, spaceId, category, description, priorities[category], filename, createdAt, createdAt],
      );
      return await db.get(`${select} WHERE r.id = ?;`, [result.lastId]);
    });
    response.status(201).json({ data: mapReport(row) });
  } catch (error) {
    if (saved) await fs.unlink(path.join(uploadRoot, filename)).catch(() => {});
    throw error;
  }
});

module.exports = { router, spaceReportsRouter };
