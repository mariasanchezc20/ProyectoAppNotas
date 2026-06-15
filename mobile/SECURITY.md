# Seguridad del cliente móvil

## S-03 — Comunicación segura y validación de certificado

Por defecto, axios sobre HTTPS ya valida la cadena de confianza del certificado
del servidor (rechaza certificados inválidos o caducados). Para reforzar contra
ataques MITM con CAs comprometidas, añade **certificate pinning**.

### Opción recomendada: `react-native-ssl-pinning`
```bash
npm install react-native-ssl-pinning
```

Reemplaza las llamadas de `src/api/client.js` por `fetch` con pinning:

```js
import { fetch as pinnedFetch } from 'react-native-ssl-pinning';

await pinnedFetch('https://api.tudominio.com/api/notes', {
  method: 'GET',
  sslPinning: {
    // SHA-256 del certificado o de la clave pública del servidor
    certs: ['sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='],
  },
  headers: { Authorization: `Bearer ${token}` },
});
```

Obtén el hash del certificado:
```bash
openssl s_client -connect api.tudominio.com:443 -servername api.tudominio.com < /dev/null 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary | openssl enc -base64
```

### Refuerzo a nivel de plataforma
- **Android:** define `network_security_config.xml` con `<pin-set>` y desactiva
  `cleartextTrafficPermitted`.
- **iOS:** mantén App Transport Security activado (`NSAllowsArbitraryLoads=false`).

## S-02 — Almacenamiento seguro
- Claves privadas RSA → `expo-secure-store` (Keychain/KeyStore).
- Nunca registres la clave privada en logs ni la envíes al servidor.
- Las notas en AsyncStorage ya están cifradas; el texto plano solo existe en
  memoria mientras se muestra.

## Buenas prácticas adicionales
- Activa bloqueo biométrico para abrir la app (expo-local-authentication).
- Borra el texto plano de memoria al salir de la pantalla del editor.
- Define expiración corta del access token (15 min) y rota el refresh token.
