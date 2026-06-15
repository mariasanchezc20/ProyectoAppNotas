const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Hash de la contraseña. Nunca se devuelve en las respuestas (select: false).
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // Token de verificación de correo (se guarda hasheado, nunca en claro).
    verificationTokenHash: { type: String, select: false },
    verificationExpires: { type: Date, select: false },

    // Clave pública RSA del dispositivo del usuario (la privada NUNCA sale del dispositivo).
    // Permite que el servidor (u otros dispositivos del usuario) cifren contenido para él.
    rsaPublicKey: { type: String, default: null },

    // Lista de refresh tokens activos (permite revocación por dispositivo).
    refreshTokens: [
      {
        tokenHash: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
        userAgent: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

// --- Métodos de instancia ---

userSchema.methods.setPassword = async function setPassword(plain) {
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(plain, salt);
};

userSchema.methods.verifyPassword = async function verifyPassword(plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

/**
 * Genera un token de verificación en claro (para el correo) y guarda su hash.
 * Devuelve el token en claro, que NO se persiste.
 */
userSchema.methods.createVerificationToken = function createVerificationToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.verificationTokenHash = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');
  this.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  return rawToken;
};

// No exponer campos sensibles al serializar a JSON.
userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    email: this.email,
    isVerified: this.isVerified,
    rsaPublicKey: this.rsaPublicKey,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
