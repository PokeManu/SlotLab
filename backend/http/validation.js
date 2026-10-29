function parsePositiveId(value, {
  code,
  message = "Identificativo non valido.",
} = {}) {
  if (!/^[1-9][0-9]*$/.test(String(value)))
    throw Object.assign(new Error(message), {
      status: 400,
      code,
    });
  return Number(value);
}

module.exports = { parsePositiveId };
