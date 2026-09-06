const jwt = require('jsonwebtoken');
const { readConfig } = require('../config');
const { getDatabase } = require('../db/db');

function unauthorized() {
  return Object.assign(new Error('Autenticazione richiesta o sessione non valida.'), {
    status: 401, code: 'UNAUTHORIZED',
  });
}

async function requireAuth(request, response, next) {
  response.set('Cache-Control', 'no-store');
  const authorization = request.get('Authorization');
  const match = typeof authorization === 'string' && /^Bearer +(\S+)$/i.exec(authorization);
  if (!match) throw unauthorized();

  const { auth } = readConfig();
  let claims;
  try {
    claims = jwt.verify(match[1], Buffer.from(auth.jwtSecret, 'hex'), {
      algorithms: ['HS256'],
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) throw unauthorized();
    throw error;
  }

  const fields = ['sub', 'role', 'iat', 'exp', 'jti'];
  if (
    !claims || typeof claims !== 'object' || Array.isArray(claims) ||
    Object.keys(claims).length !== fields.length ||
    !fields.every(field => Object.hasOwn(claims, field)) ||
    typeof claims.sub !== 'string' || !/^[1-9][0-9]*$/.test(claims.sub) ||
    !Number.isSafeInteger(Number(claims.sub)) ||
    !['user', 'admin'].includes(claims.role) ||
    !Number.isInteger(claims.iat) || claims.iat > Math.floor(Date.now() / 1000) ||
    !Number.isInteger(claims.exp) || claims.exp - claims.iat !== auth.accessTokenSeconds ||
    typeof claims.jti !== 'string' || claims.jti.trim().length === 0
  ) {
    throw unauthorized();
  }

  // La firma non basta: account, ruolo e jti devono essere ancora correnti.
  const user = await new Promise((resolve, reject) => {
    getDatabase().get(
      `SELECT u.id, u.first_name AS firstName, u.last_name AS lastName,
              u.email, u.role, u.created_at AS createdAt
       FROM users u JOIN auth_sessions s ON s.user_id = u.id
       WHERE u.id = ? AND u.role = ? AND s.access_token_jti = ?;`,
      [Number(claims.sub), claims.role, claims.jti],
      (error, row) => error ? reject(error) : resolve(row),
    );
  });
  if (!user) throw unauthorized();

  request.user = user;
  next();
}

function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.user) return next(unauthorized());
    if (!roles.includes(request.user.role)) {
      return next(Object.assign(new Error('Non hai i permessi per questa operazione.'), {
        status: 403, code: 'FORBIDDEN',
      }));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
