function errorHandler(error, request, response, next) {
  let status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
    ? error.status : 500;
  let code = error.code || 'INTERNAL_ERROR';
  let message = error.message || 'Si e verificato un errore inatteso.';

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Il corpo JSON della richiesta non e valido.';
  }

  if (error.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Il corpo della richiesta supera la dimensione consentita.';
  }

  if (status >= 500) {
    // Non stampare l'oggetto completo: potrebbe contenere dati della richiesta.
    console.error('Errore interno durante la gestione di una richiesta.');
    code = 'INTERNAL_ERROR';
    message = 'Si e verificato un errore inatteso.';
  }

  const responseError = { code, message };

  if (status < 500 && error.details !== undefined) {
    responseError.details = error.details;
  }

  response.status(status).json({ error: responseError });
}

module.exports = errorHandler;
