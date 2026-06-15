const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_SECRET = () => process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = () => process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = () => process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = () => process.env.JWT_REFRESH_EXPIRES || '7d';

/**
 * S-04: Genera un access token de corta duración.
 * jti permite identificar y, si se quiere, revocar tokens concretos.
 */
function signAccessToken(user) {
  const jti = crypto.randomUUID();
  return jwt.sign({ sub: user._id.toString(), email: user.email, jti }, ACCESS_SECRET(), {
    expiresIn: ACCESS_EXPIRES(),
  });
}

/**
 * S-04: Genera un refresh token de mayor duración.
 * Se devuelve también su hash (lo que se guarda en BD para poder revocarlo).
 */
function signRefreshToken(user) {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ sub: user._id.toString(), jti }, REFRESH_SECRET(), {
    expiresIn: REFRESH_EXPIRES(),
  });
  return { token, jti, tokenHash: hashToken(token) };
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET());
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET());
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function decodeExpiry(token) {
  const decoded = jwt.decode(token);
  return decoded && decoded.exp ? new Date(decoded.exp * 1000) : null;
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  decodeExpiry,
};
