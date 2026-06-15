const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE) === 'true', // true => puerto 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

/**
 * F-01: Envía el correo de verificación con un enlace de activación.
 */
async function sendVerificationEmail(toEmail, rawToken) {
  const verifyUrl = `${process.env.APP_URL}/api/auth/verify?token=${rawToken}&email=${encodeURIComponent(
    toEmail
  )}`;

  const info = await getTransporter().sendMail({
    from: process.env.MAIL_FROM || 'no-reply@notes.app',
    to: toEmail,
    subject: 'Verifica tu cuenta - Notes App',
    text: `Bienvenido a Notes App.\n\nActiva tu cuenta abriendo este enlace (válido 24h):\n${verifyUrl}\n\nSi no creaste esta cuenta, ignora este correo.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Bienvenido a Notes App</h2>
        <p>Para activar tu cuenta haz clic en el botón (enlace válido por 24 horas):</p>
        <p>
          <a href="${verifyUrl}"
             style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none">
            Activar cuenta
          </a>
        </p>
        <p style="color:#666;font-size:13px">Si no creaste esta cuenta, ignora este correo.</p>
      </div>
    `,
  });

  // En desarrollo con Ethereal, esto muestra una URL para previsualizar el correo.
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) console.log('[mail] Vista previa:', preview);
  return info;
}

module.exports = { sendVerificationEmail };
