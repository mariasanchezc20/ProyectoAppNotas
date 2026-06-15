/**
 * S-05: Manejador centralizado de errores.
 * Nunca expone stack traces ni detalles internos al cliente en producción.
 */
function notFound(req, res) {
  res.status(404).json({ message: 'Recurso no encontrado' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Log interno completo (solo en servidor), no se envía al cliente.
  console.error('[error]', err.message, process.env.NODE_ENV === 'development' ? err.stack : '');

  // Errores conocidos de Mongo (clave duplicada).
  if (err.code === 11000) {
    return res.status(409).json({ message: 'El recurso ya existe' });
  }

  const status = err.status || 500;
  const message =
    status === 500 ? 'Error interno del servidor' : err.message || 'Error';

  res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
