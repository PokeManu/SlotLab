function invalidPagination() {
  return Object.assign(
    new Error("I parametri di paginazione non sono validi."),
    { status: 400, code: "VALIDATION_ERROR" },
  );
}

function pagination(request) {
  const page =
    request.query.page === undefined ? 1 : Number(request.query.page);
  const size =
    request.query.size === undefined ? 20 : Number(request.query.size);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > 100
  ) {
    throw invalidPagination();
  }
  return { page, size, offset: (page - 1) * size };
}

module.exports = { invalidPagination, pagination };
