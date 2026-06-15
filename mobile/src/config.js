/**
 * Configuración central de la app.
 *
 * S-03: En producción API_BASE_URL DEBE ser https:// y el certificado del
 * servidor debe ser válido (o usar certificate pinning, ver crypto/README en el chat).
 */

// Cambia esto por la URL de tu backend.
// - Emulador Android apuntando a tu PC: http://10.0.2.2:4000
// - Dispositivo físico: http://<IP-de-tu-PC>:4000
// - Producción: https://api.tudominio.com
export const API_BASE_URL = 'http://10.0.2.2:4000';

export const TOKEN_REFRESH_MARGIN_MS = 60 * 1000; // renovar 1 min antes de expirar
