const { verifyAccessToken } = require('../services/tokenService');
const User = require('../models/User');

/**
 * S-04: Protege rutas exigiendo un access token JWT válido en el header Authorization.
 * Formato esperado: "Authorization: Bearer <token>"
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      // S-05: mensaje genérico, sin filtrar detalle del error de verificación.
      return res.status(401).json({ message: 'Sesión inválida o expirada' });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };
