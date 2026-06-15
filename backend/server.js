require('dotenv').config();
const fs = require('fs');
const http = require('http');
const https = require('https');

const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB();

  const keyPath = process.env.TLS_KEY_PATH;
  const certPath = process.env.TLS_CERT_PATH;

  // S-03: si hay certificados, se sirve sobre HTTPS. En desarrollo, HTTP.
  if (keyPath && certPath && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    const options = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    https.createServer(options, app).listen(PORT, () => {
      console.log(`[server] HTTPS escuchando en https://localhost:${PORT}`);
    });
  } else {
    http.createServer(app).listen(PORT, () => {
      console.log(`[server] HTTP escuchando en http://localhost:${PORT}`);
      if (process.env.NODE_ENV === 'production') {
        console.warn('[server] ¡ADVERTENCIA! En producción debes usar HTTPS (TLS).');
      }
    });
  }
}

start().catch((err) => {
  console.error('[server] Falló el arranque:', err);
  process.exit(1);
});
