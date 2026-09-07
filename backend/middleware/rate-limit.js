const crypto = require('node:crypto');
const stores = new Set();

function rateLimit({ limit, windowMs, key = request => request.ip, maxKeys = 10000, now = Date.now }) {
  const entries = new Map();
  stores.add(entries);
  return (request, response, next) => {
    const time = now();
    // Nessun timer o IP/email in chiaro conservati; memoria limitata anche con chiavi nuove.
    for (const [id, entry] of entries) if (entry.until <= time) entries.delete(id);
    const id = crypto.createHash('sha256').update(String(key(request))).digest('hex');
    let entry = entries.get(id);
    if (!entry && entries.size < maxKeys) {
      entry = { count: 0, until: time + windowMs };
      entries.set(id, entry);
    }
    if (!entry || entry.count >= limit) {
      response.set('Retry-After', String(Math.max(1, Math.ceil(((entry?.until ?? time + windowMs) - time) / 1000))));
      return response.status(429).json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Troppi tentativi. Riprova più tardi.' } });
    }
    entry.count++;
    next();
  };
}

// Permette alle prove isolate di partire da finestre vuote; non esiste un endpoint di reset.
function resetRateLimits() { for (const store of stores) store.clear(); }
module.exports = { rateLimit, resetRateLimits };
