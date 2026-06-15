# Notas Seguras — App de notas cifradas

Aplicación full-stack de notas con cifrado en el dispositivo:

- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **Móvil:** React Native (Expo)
- **Seguridad:** JWT con refresh/revocación, cifrado híbrido RSA+AES en el cliente, claves en Keychain/KeyStore, HTTPS, validación y sanitización de entradas.

```
notes-app/
├── backend/      # API REST (Node/Express/MongoDB)
└── mobile/       # App React Native (Expo)
```

---

## 1. Backend

### Requisitos
- Node.js 18+
- MongoDB (local en `mongodb://127.0.0.1:27017` o Atlas)
- Una cuenta SMTP para el correo de verificación (en desarrollo puedes usar [Ethereal](https://ethereal.email))

### Puesta en marcha
```bash
cd backend
cp .env.example .env      # edita los valores (secretos JWT, MONGO_URI, SMTP...)
npm install
npm run dev               # arranca en http://localhost:4000
```

Genera secretos JWT fuertes:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Endpoints principales
| Método | Ruta                     | Descripción                       | Req. |
|--------|--------------------------|-----------------------------------|------|
| POST   | `/api/auth/register`     | Registro + correo de verificación | F-01 |
| GET    | `/api/auth/verify`       | Activar cuenta                    | F-01 |
| POST   | `/api/auth/login`        | Login (devuelve JWT)              | F-02 |
| POST   | `/api/auth/refresh`      | Renovar tokens (rotación)         | S-04 |
| POST   | `/api/auth/logout`       | Revocar refresh token             | S-04 |
| POST   | `/api/auth/public-key`   | Registrar clave pública RSA       | S-01 |
| GET    | `/api/notes`             | Listar notas                      | F-03 |
| POST   | `/api/notes`             | Crear nota                        | F-03 |
| PUT    | `/api/notes/:id`         | Actualizar nota                   | F-04 |
| DELETE | `/api/notes/:id`         | Eliminar nota                     | F-05 |
| GET    | `/api/notes/search`      | Buscar (título/categoría)         | F-06 |
| POST   | `/api/notes/sync`        | Sincronizar offline               | F-07 |

---

## 2. App móvil (Expo)

### Puesta en marcha
```bash
cd mobile
npm install
npx expo start            # abre con Expo Go o emulador
```

Edita `src/config.js` y pon la URL de tu backend:
- Emulador Android → `http://10.0.2.2:4000`
- Dispositivo físico → `http://<IP-de-tu-PC>:4000`
- Producción → `https://api.tudominio.com`

> El módulo `expo-secure-store` (Keychain/KeyStore) y `node-forge` requieren un
> *development build* o Expo Go reciente. Para producción usa `eas build`.

---

## 3. Cómo se cumple cada requerimiento

### Funcionales
- **F-01 Registro:** `authController.register` crea el usuario con contraseña
  hasheada (bcrypt, 12 rondas), genera un token de verificación (guardado solo
  como hash) y envía el correo con `emailService`. La app genera el par RSA y
  registra la clave pública.
- **F-02 Login:** `authController.login` valida credenciales y emite
  `accessToken` (corto) + `refreshToken` (largo). El refresh se guarda hasheado
  para poder revocarlo.
- **F-03 Crear nota:** El contenido se cifra en el dispositivo y se envía a
  `POST /api/notes`. Incluye título, contenido (cifrado) y categoría.
- **F-04 Actualizar:** `PUT /api/notes/:id`, solo el dueño.
- **F-05 Eliminar:** `DELETE /api/notes/:id` (borrado lógico para propagar entre
  dispositivos).
- **F-06 Buscar:** Servidor busca por título/categoría (`/search`). El contenido,
  al estar cifrado, se busca en el cliente sobre las notas ya descifradas
  (`NotesContext.searchNotes`).
- **F-07 Sincronización:** `syncService` detecta conexión con NetInfo, envía los
  cambios pendientes a `/api/notes/sync` y reconcilia (last-write-wins por versión).

### Seguridad
- **S-01 Cifrado de notas:** Cifrado **híbrido** en `crypto/noteCrypto.js`: el
  contenido se cifra con AES-256-GCM y la clave AES se cifra con la **clave
  pública RSA** (RSA-OAEP). El descifrado usa la **clave privada** que nunca sale
  del dispositivo. (RSA puro no puede cifrar textos largos; el patrón híbrido es
  el estándar correcto y sigue "cifrar con clave pública RSA antes de enviar".)
- **S-02 Almacenamiento seguro:** Las claves se guardan con `expo-secure-store`
  → **Keychain (iOS)** / **KeyStore (Android)**. Las notas cifradas se guardan en
  AsyncStorage ya cifradas (el contenido nunca se persiste en claro).
- **S-03 Comunicación segura:** El backend soporta HTTPS (TLS), aplica HSTS con
  Helmet. La app fuerza `usesCleartextTraffic=false` (Android) y ATS (iOS).
  Para *certificate pinning* ver `mobile/SECURITY.md`.
- **S-04 Autenticación y sesiones:** JWT con expiración configurable, refresh con
  **rotación**, **revocación** por dispositivo (lista de hashes en BD) y logout.
- **S-05 Protección contra ataques:** `express-validator` valida/sanea entradas,
  `express-mongo-sanitize` evita inyección NoSQL, `hpp` evita contaminación de
  parámetros, `helmet` aplica cabeceras seguras, `express-rate-limit` mitiga
  fuerza bruta y los errores nunca filtran stack traces ni detalles internos.

---

## 4. Notas de producción
- Usa siempre HTTPS con certificados válidos y considera *certificate pinning*.
- Mueve los secretos a un gestor seguro (no commitees el `.env`).
- Configura backups y un índice TTL para limpiar refresh tokens expirados.
- Considera rotar las claves RSA y respaldar la clave privada de forma segura
  (si el usuario pierde el dispositivo, pierde acceso a sus notas cifradas).
