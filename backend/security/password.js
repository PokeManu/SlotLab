const crypto = require("crypto");
const { validatePassword } = require("./validation");
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
function deriveKey(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: SCRYPT_MAX_MEMORY,
      },
      (error, key) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(key);
      },
    );
  });
}
async function hashPassword(password) {
  validatePassword(password);
  const salt = crypto.randomBytes(16);
  const key = await deriveKey(password, salt);
  return [
    "scrypt",
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString("hex"),
    key.toString("hex"),
  ].join("$");
}
async function verifyPassword(password, storedHash) {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 64 ||
    typeof storedHash !== "string" ||
    storedHash.length !== 178
  ) {
    return false;
  }
  const [algorithm, cost, blockSize, parallelization, saltHex, keyHex] =
    storedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    cost !== String(SCRYPT_COST) ||
    blockSize !== String(SCRYPT_BLOCK_SIZE) ||
    parallelization !== String(SCRYPT_PARALLELIZATION) ||
    !/^[a-f0-9]{32}$/.test(saltHex) ||
    !/^[a-f0-9]{128}$/.test(keyHex)
  ) {
    return false;
  }
  const salt = Buffer.from(saltHex, "hex");
  const expectedKey = Buffer.from(keyHex, "hex");
  const actualKey = await deriveKey(password, salt);
  return crypto.timingSafeEqual(actualKey, expectedKey);
}
module.exports = {
  hashPassword,
  verifyPassword,
};
