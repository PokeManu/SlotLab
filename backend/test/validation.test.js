const assert = require("node:assert/strict");
const { test } = require("node:test");
const { parseIsoDate, isIsoDate } = require("../domain/time");
const { parsePositiveId } = require("../http/validation");

test("parsePositiveId conserva la regola degli ID testuali e il contratto dell'errore", () => {
  assert.equal(parsePositiveId("42", {
    code: "INVALID_SPACE_ID",
    message: "Identificativo spazio non valido.",
  }), 42);
  assert.equal(parsePositiveId(7, { code: "INVALID_ID" }), 7);

  for (const value of ["", "0", "01", "-1", "1.0", "1e2", null, undefined]) {
    assert.throws(
      () => parsePositiveId(value, {
        code: "INVALID_ID",
        message: "Identificativo non valido.",
      }),
      (error) =>
        error.status === 400 &&
        error.code === "INVALID_ID" &&
        error.message === "Identificativo non valido.",
    );
  }
});

test("parseIsoDate convalida date reali, compresi gli anni a quattro cifre", () => {
  assert.deepEqual(parseIsoDate("2024-02-29"), {
    value: "2024-02-29",
    weekday: 4,
  });
  assert.deepEqual(parseIsoDate("0000-01-01"), {
    value: "0000-01-01",
    weekday: 6,
  });
  assert.equal(parseIsoDate("2023-02-29"), null);
  assert.equal(parseIsoDate("2024-2-9"), null);
  assert.equal(parseIsoDate(20240229), null);
});

test("isIsoDate mantiene un predicato booleano per i servizi", () => {
  assert.equal(isIsoDate("0099-12-31"), true);
  assert.equal(isIsoDate("2026-02-29"), false);
  assert.equal(isIsoDate(undefined), false);
});
