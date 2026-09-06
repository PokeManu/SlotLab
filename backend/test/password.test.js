const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { test } = require('node:test');
const { hashPassword, verifyPassword } = require('../security/password');
const {
  validateEmail,
  validatePassword,
  normalizeAndValidateAccount,
} = require('../security/validation');

const password = 'TestPassword2026!';

test('email normalizzata e formati non validi rifiutati', () => {
  assert.equal(validateEmail(' \tUSER@Example.test\n'), 'user@example.test');
  for (const value of [undefined, null, 42, {}, '', '  ', 'user',
    'user@host', '@example.test', 'user@@example.test', 'u ser@example.test']) {
    assert.throws(() => validateEmail(value), /email non e valida/);
  }
});

test('dati account normalizzati senza modificare input o password', () => {
  const account = Object.freeze({
    firstName: ' Mario ', lastName: ' Rossi ',
    email: ' USER@Example.test ', password,
  });
  assert.deepEqual(normalizeAndValidateAccount(account), {
    firstName: 'Mario', lastName: 'Rossi', email: 'user@example.test', password,
  });
  for (const value of [null, undefined, {}, { ...account, firstName: 42 },
    { ...account, firstName: ' \t' }, { ...account, lastName: '' },
    { ...account, email: null }, { ...account, password: null }]) {
    assert.throws(() => normalizeAndValidateAccount(value));
  }
});

test('password: limiti 8 e 64 inclusi e categorie obbligatorie', () => {
  for (const value of ['Aa1!aaaa', 'Aa1!' + 'a'.repeat(60)]) {
    assert.equal(validatePassword(value), value);
  }
  for (const value of [undefined, null, 42, {}, '', 'Aa1!aaa',
    'Aa1!' + 'a'.repeat(61), 'abcdef1!', 'ABCDEF1!', 'Abcdefg!', 'Abcdefg1']) {
    assert.throws(() => validatePassword(value), /La password deve avere 8-64/);
  }
});

test('password: whitespace rifiutato anche ai bordi, senza trim', () => {
  for (const whitespace of [' ', '\t', '\n', '\r', '\u00a0', '\u2003', '\ufeff']) {
    for (const value of [whitespace + password, password + whitespace,
      'Test' + whitespace + 'Password2026!']) {
      assert.throws(() => validatePassword(value), /senza spazi/);
    }
  }
});

test('hash e verifica: password corretta, errata e nessuna correzione implicita', async () => {
  const hash = await hashPassword(password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword('WrongPassword2026!', hash), false);
  assert.equal(await verifyPassword(password.toLowerCase(), hash), false);
  assert.equal(await verifyPassword(' ' + password, hash), false);
  assert.equal(await verifyPassword(password + '\n', hash), false);
  for (const value of [undefined, null, 42, {}, '', 'Aa1!aaa', 'a'.repeat(65)]) {
    assert.equal(await verifyPassword(value, hash), false);
  }
});

test('hash: validazione prima del calcolo e limiti verificabili', async () => {
  for (const value of ['Aa1!aaaa', 'Aa1!' + 'a'.repeat(60)]) {
    assert.equal(await verifyPassword(value, await hashPassword(value)), true);
  }
  for (const value of ['debole', password + ' ', 'Aa1!' + 'a'.repeat(61), null]) {
    await assert.rejects(hashPassword(value), /La password deve avere 8-64/);
  }
});

test('stessa password con sali diversi produce hash diversi ma verificabili', async () => {
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first.split('$')[4], second.split('$')[4]);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(password, second), true);
});

test('verifica compatibile con il formato scrypt precedente al punto 3.2', async () => {
  // Riproduce il vecchio formato senza passare dal nuovo hashPassword.
  const salt = Buffer.from('00112233445566778899aabbccddeeff', 'hex');
  const key = crypto.scryptSync(password, salt, 64, {
    N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024,
  });
  const hash = `scrypt$16384$8$1$${salt.toString('hex')}$${key.toString('hex')}`;
  assert.equal(await verifyPassword(password, hash), true);
});

test('hash malformati e parametri alterati restituiscono false senza calcolare scrypt', async (t) => {
  const hash = await hashPassword(password);
  const parts = hash.split('$');
  const changed = (index, value) => parts.map((part, i) => i === index ? value : part).join('$');
  const scrypt = t.mock.method(crypto, 'scrypt', () => {
    throw new Error('scrypt non deve essere chiamato per hash non validi');
  });
  for (const value of [undefined, null, 42, {}, '', 'x'.repeat(10000),
    hash + '\n', hash + '$extra', hash.slice(0, -1),
    changed(0, 'bcrypt'), changed(1, '32768'), changed(1, '999999999'),
    changed(2, '9'), changed(3, '2'), changed(4, 'a'.repeat(31)),
    changed(4, 'g'.repeat(32)), changed(5, 'z'.repeat(128))]) {
    assert.equal(await verifyPassword(password, value), false);
  }
  assert.equal(scrypt.mock.callCount(), 0);
});
