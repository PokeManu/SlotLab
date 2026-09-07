const fs = require('node:fs/promises');
const path = require('node:path');
const { queries } = require('../db/transaction');
const { getDatabase } = require('../db/db');

function photoName(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(value)) {
    throw new Error('Riferimento fotografia non valido.');
  }
  return value;
}

let cleaning;
function cleanDeletedFiles() {
  if (cleaning) return cleaning;
  cleaning = (async () => {
    const query = queries(getDatabase());
    const root = process.env.SLOTLAB_UPLOAD_DIR || path.join(__dirname, '..', 'uploads', 'reports');
    if (!path.isAbsolute(root)) throw new Error('La cartella foto deve essere assoluta.');
    const files = await query.all('SELECT filename FROM file_deletions');
    for (const file of files) {
      try {
        const filename = photoName(file.filename);
        // unlink rimuove il link stesso, senza seguire eventuali symlink del file.
        await fs.unlink(path.join(root, filename)).catch(e => { if (e.code !== 'ENOENT') throw e; });
        await query.run('DELETE FROM file_deletions WHERE filename = ?', [filename]);
      } catch {
        console.error('Rimozione fotografia da riprovare; riferimento conservato nella coda tecnica.');
      }
    }
  })().finally(() => { cleaning = undefined; });
  return cleaning;
}

module.exports = { photoName, cleanDeletedFiles };
