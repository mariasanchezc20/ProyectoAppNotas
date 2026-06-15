const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const noteRoutes = require('./routes/noteRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Detrás de un proxy/balanceador (necesario para rate-limit con IP real).
app.set('trust proxy', 1);

// S-03 / S-05: cabeceras de seguridad (incluye HSTS para forzar HTTPS).
app.use(
  helmet({
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || '*',
    credentials: true,
  })
);

// Límite de tamaño del body para evitar payloads abusivos.
app.use(express.json({ limit: '1mb' }));

// S-05: sanitiza entradas para prevenir inyección NoSQL ($, .) y contaminación de parámetros.
app.use(mongoSanitize());
app.use(hpp());

// Rate limit global suave.
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Demasiadas solicitudes' },
  })
);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
