function validateEmail(value) {
  if (typeof value !== 'string') {
    throw Object.assign(new Error("L'email non e valida."), { code: 'INVALID_EMAIL' });
  }

  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error("L'email non e valida."), { code: 'INVALID_EMAIL' });
  }

  return email;
}

function validatePassword(password) {
  const validPassword =
    typeof password === 'string' &&
    password.length >= 8 &&
    password.length <= 64 &&
    !/\s/.test(password) &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  if (!validPassword) {
    throw Object.assign(new Error(
      'La password deve avere 8-64 caratteri, senza spazi, con maiuscola, minuscola, numero e carattere speciale.',
    ), { code: 'INVALID_PASSWORD_FORMAT' });
  }

  return password;
}

function normalizeAndValidateAccount(account) {
  if (
    !account ||
    typeof account.firstName !== 'string' ||
    typeof account.lastName !== 'string' ||
    typeof account.email !== 'string' ||
    typeof account.password !== 'string'
  ) {
    throw Object.assign(new Error("I dati dell'account non sono completi."), {
      code: 'VALIDATION_ERROR',
    });
  }

  const firstName = account.firstName.trim();
  const lastName = account.lastName.trim();
  if (!firstName || !lastName) {
    throw Object.assign(new Error('Nome e cognome sono obbligatori.'), {
      code: 'VALIDATION_ERROR',
    });
  }

  return {
    firstName,
    lastName,
    email: validateEmail(account.email),
    password: validatePassword(account.password),
  };
}

module.exports = {
  validateEmail,
  validatePassword,
  normalizeAndValidateAccount,
};
