const mongoose = require('mongoose');

/**
 * Conecta a MongoDB usando la URI de entorno.
 * Termina el proceso si la conexión falla en el arranque.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI no está definida en el entorno');
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('[db] Conectado a MongoDB');
  } catch (err) {
    console.error('[db] Error de conexión:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('[db] Error en runtime:', err.message);
  });
}

module.exports = connectDB;
