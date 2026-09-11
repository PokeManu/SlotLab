const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
function createSessionTokens(user, auth) {
  const now = new Date();
  const jti = crypto.randomUUID();
  const refreshToken = crypto.randomBytes(32).toString("base64url");
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const accessToken = jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
      iat: Math.floor(now.getTime() / 1000),
      jti,
    },
    Buffer.from(auth.jwtSecret, "hex"),
    {
      algorithm: "HS256",
      expiresIn: auth.accessTokenSeconds,
    },
  );
  return {
    accessToken,
    refreshToken,
    refreshTokenHash,
    jti,
    createdAt: now.toISOString(),
    refreshExpiresAt: new Date(
      now.getTime() + auth.refreshTokenSeconds * 1000,
    ).toISOString(),
  };
}
module.exports = { createSessionTokens, hashRefreshToken };
