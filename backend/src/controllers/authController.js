const crypto = require('crypto');
const User = require('../models/User');
const { sendVerificationEmail } = require('../services/emailService');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  decodeExpiry,
} = require('../services/tokenService');

/**
 * F-01: Registro de usuario.
 * - Crea la cuenta con email + contraseña (hasheada).
 * - Genera token de verificación y envía correo de activación.
 */
async function register(req, res, next) {
  try {
    const { email, password, rsaPublicKey } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      // S-05: no revelamos si el correo ya existe de forma explotable; mensaje genérico.
      return res
        .status(409)
        .json({ message: 'No se pudo completar el registro' });
    }

    const user = new User({ email, rsaPublicKey: rsaPublicKey || null });
    await user.setPassword(password);
    const rawToken = user.createVerificationToken();
    await user.save();

    try {
      await sendVerificationEmail(email, rawToken);
    } catch (mailErr) {
      console.error('[auth] Error enviando correo:', mailErr.message);
      // La cuenta queda creada; se puede reenviar la verificación luego.
    }

    return res.status(201).json({
      message:
        'Cuenta creada. Revisa tu correo para activar la cuenta.',
      user: user.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * F-01: Verificación de correo. Activa la cuenta si el token es válido.
 */
async function verifyEmail(req, res, next) {
  try {
    const { token, email } = req.query;
    if (!token || !email) {
      return res.status(400).json({ message: 'Solicitud inválida' });
    }

    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const user = await User.findOne({ email: String(email).toLowerCase() }).select(
      '+verificationTokenHash +verificationExpires'
    );

    if (
      !user ||
      !user.verificationTokenHash ||
      user.verificationTokenHash !== tokenHash ||
      !user.verificationExpires ||
      user.verificationExpires.getTime() < Date.now()
    ) {
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }

    user.isVerified = true;
    user.verificationTokenHash = undefined;
    user.verificationExpires = undefined;
    await user.save();

    return res.json({ message: 'Cuenta verificada correctamente. Ya puedes iniciar sesión.' });
  } catch (err) {
    next(err);
  }
}

/**
 * F-02 / S-04: Inicio de sesión. Devuelve access + refresh token.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+passwordHash');
    // S-05: mismo mensaje tanto si no existe el usuario como si la clave es incorrecta.
    const genericError = { message: 'Credenciales inválidas' };

    if (!user) return res.status(401).json(genericError);

    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(401).json(genericError);

    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: 'Debes verificar tu correo antes de iniciar sesión' });
    }

    const accessToken = signAccessToken(user);
    const { token: refreshToken, tokenHash, } = signRefreshToken(user);

    // Guardamos el hash del refresh token para permitir revocación (S-04).
    user.refreshTokens.push({
      tokenHash,
      expiresAt: decodeExpiry(refreshToken),
      userAgent: req.headers['user-agent'] || '',
    });
    // Limita la cantidad de sesiones activas a las 10 más recientes.
    if (user.refreshTokens.length > 10) {
      user.refreshTokens = user.refreshTokens.slice(-10);
    }
    await user.save();

    return res.json({
      accessToken,
      refreshToken,
      user: user.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * S-04: Renovación de tokens. Rota el refresh token (revoca el anterior).
 */
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Token requerido' });

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }

    const user = await User.findById(payload.sub).select('+refreshTokens');
    if (!user) return res.status(401).json({ message: 'No autorizado' });

    const incomingHash = hashToken(refreshToken);
    const stored = user.refreshTokens.find((t) => t.tokenHash === incomingHash);

    // Si el refresh token no está en la lista, fue revocado o es falso.
    if (!stored) {
      return res.status(401).json({ message: 'Token revocado' });
    }

    // Rotación: elimina el token usado y emite uno nuevo.
    user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== incomingHash);
    const accessToken = signAccessToken(user);
    const { token: newRefresh, tokenHash } = signRefreshToken(user);
    user.refreshTokens.push({
      tokenHash,
      expiresAt: decodeExpiry(newRefresh),
      userAgent: req.headers['user-agent'] || '',
    });
    await user.save();

    return res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) {
    next(err);
  }
}

/**
 * S-04: Logout. Revoca el refresh token enviado (o todos si se indica).
 */
async function logout(req, res, next) {
  try {
    const { refreshToken, allDevices } = req.body;
    const user = await User.findById(req.user._id).select('+refreshTokens');
    if (!user) return res.status(401).json({ message: 'No autorizado' });

    if (allDevices) {
      user.refreshTokens = [];
    } else if (refreshToken) {
      const h = hashToken(refreshToken);
      user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== h);
    }
    await user.save();

    return res.json({ message: 'Sesión cerrada' });
  } catch (err) {
    next(err);
  }
}

/**
 * Registra/actualiza la clave pública RSA del dispositivo del usuario.
 */
async function setPublicKey(req, res, next) {
  try {
    const { rsaPublicKey } = req.body;
    if (!rsaPublicKey || typeof rsaPublicKey !== 'string') {
      return res.status(400).json({ message: 'Clave pública requerida' });
    }
    req.user.rsaPublicKey = rsaPublicKey;
    await req.user.save();
    return res.json({ message: 'Clave pública guardada', rsaPublicKey });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  return res.json({ user: req.user.toSafeJSON() });
}

module.exports = {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  setPublicKey,
  me,
};
