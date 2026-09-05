function notFound(request, response, next) {
  const error = new Error('La risorsa richiesta non esiste.');
  error.status = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
}

module.exports = notFound;
