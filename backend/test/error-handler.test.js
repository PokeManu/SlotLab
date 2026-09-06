const assert = require('node:assert/strict');
const { test } = require('node:test');
const errorHandler = require('../middleware/error-handler');

function responseFor(error) {
  const response = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  errorHandler(error, {}, response, () => {});
  return response;
}

test('gli errori interni rispettano il contratto e non espongono dati', (t) => {
  const log = t.mock.method(console, 'error', () => {});
  const response = responseFor(Object.assign(new Error('dettaglio riservato'), {
    status: 500, code: 'SQLITE_ERROR', details: { password: 'dato riservato' },
  }));
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { error: {
    code: 'INTERNAL_ERROR', message: 'Si e verificato un errore inatteso.',
  } });
  assert.deepEqual(log.mock.calls[0].arguments, [
    'Errore interno durante la gestione di una richiesta.',
  ]);
});

test('gli errori applicativi mantengono codice e dettagli utili', () => {
  const response = responseFor(Object.assign(new Error('Posti insufficienti.'), {
    status: 409, code: 'INSUFFICIENT_CAPACITY', details: { availableSeats: 1 },
  }));
  assert.equal(response.statusCode, 409);
  assert.equal(response.body.error.code, 'INSUFFICIENT_CAPACITY');
  assert.deepEqual(response.body.error.details, { availableSeats: 1 });
});

test('uno stato HTTP non valido diventa un errore interno controllato', (t) => {
  t.mock.method(console, 'error', () => {});
  for (const status of [200, 999, '400']) {
    const response = responseFor(Object.assign(new Error('errore'), { status }));
    assert.equal(response.statusCode, 500);
    assert.equal(response.body.error.code, 'INTERNAL_ERROR');
  }
});
