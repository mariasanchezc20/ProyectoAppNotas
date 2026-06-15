const mongoose = require('mongoose');

/**
 * Estructura del contenido cifrado (cifrado híbrido RSA + AES, hecho en el cliente).
 * El servidor NUNCA puede leer el contenido: solo almacena el blob cifrado.
 *  - encryptedKey: clave AES-256 cifrada con la clave pública RSA del usuario.
 *  - iv: vector de inicialización de AES-GCM.
 *  - cipherText: contenido cifrado con AES-GCM.
 *  - authTag: etiqueta de autenticación de AES-GCM.
 */
const encryptedContentSchema = new mongoose.Schema(
  {
    encryptedKey: { type: String, required: true },
    iv: { type: String, required: true },
    cipherText: { type: String, required: true },
    authTag: { type: String, required: true },
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Título y categoría se guardan en claro para permitir la búsqueda en el servidor (F-06).
    // Si quieres máxima confidencialidad, también pueden cifrarse y buscar solo en cliente.
    title: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, trim: true, maxlength: 60, default: 'General', index: true },

    // Contenido cifrado (confidencial). El servidor no lo descifra.
    content: { type: encryptedContentSchema, required: true },

    // --- Soporte de sincronización offline (F-07) ---
    // ID generado en el cliente para correlacionar notas locales con las del servidor.
    clientId: { type: String, index: true },
    // Versión incremental para resolver conflictos (last-write-wins por defecto).
    version: { type: Number, default: 1 },
    // Marca de borrado lógico para que el borrado se propague entre dispositivos.
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Índice de texto para búsqueda por título y categoría (F-06).
noteSchema.index({ title: 'text', category: 'text' });
// Una nota por (owner, clientId) para evitar duplicados al sincronizar.
noteSchema.index({ owner: 1, clientId: 1 }, { unique: true, sparse: true });

noteSchema.methods.toClientJSON = function toClientJSON() {
  return {
    id: this._id,
    clientId: this.clientId,
    title: this.title,
    category: this.category,
    content: this.content, // sigue cifrado: el cliente lo descifra
    version: this.version,
    isDeleted: this.isDeleted,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Note', noteSchema);
