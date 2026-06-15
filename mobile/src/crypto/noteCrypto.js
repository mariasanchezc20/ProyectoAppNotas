import 'react-native-get-random-values';
import forge from 'node-forge';
import {
  savePrivateKey,
  getPrivateKey,
  savePublicKey,
  getPublicKey,
  hasKeyPair,
} from '../storage/secureKeyStore';

/**
 * S-01: Cifrado de notas en el dispositivo.
 *
 * Esquema de cifrado HÍBRIDO (estándar y correcto para datos grandes):
 *   1. Se genera una clave AES-256 aleatoria por nota.
 *   2. El contenido se cifra con AES-256-GCM (rápido, autenticado).
 *   3. La clave AES se cifra con la CLAVE PÚBLICA RSA del usuario (RSA-OAEP).
 *
 * Solo la CLAVE PRIVADA RSA (guardada en Keychain/KeyStore) puede recuperar la
 * clave AES y, con ella, descifrar el contenido. El servidor nunca ve nada en claro.
 *
 * (RSA por sí solo no puede cifrar textos largos; por eso se usa el patrón híbrido,
 *  que sigue cumpliendo "cifrar con clave pública RSA antes de enviar".)
 */

const RSA_BITS = 2048;

/**
 * Genera el par de claves RSA si aún no existe y lo guarda de forma segura.
 * Devuelve la clave pública en PEM (para registrarla en el backend).
 */
export async function ensureKeyPair() {
  if (await hasKeyPair()) {
    return getPublicKey();
  }
  const { publicKeyPem, privateKeyPem } = await generateRsaKeyPair();
  await savePrivateKey(privateKeyPem);
  await savePublicKey(publicKeyPem);
  return publicKeyPem;
}

function generateRsaKeyPair() {
  return new Promise((resolve, reject) => {
    forge.pki.rsa.generateKeyPair({ bits: RSA_BITS, workers: -1 }, (err, keypair) => {
      if (err) return reject(err);
      resolve({
        publicKeyPem: forge.pki.publicKeyToPem(keypair.publicKey),
        privateKeyPem: forge.pki.privateKeyToPem(keypair.privateKey),
      });
    });
  });
}

/**
 * Cifra un texto plano con la clave pública RSA en PEM.
 * Devuelve el objeto que se envía al backend (todo en base64).
 */
export function encryptContent(plainText, publicKeyPem) {
  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);

  // 1) Clave AES y IV aleatorios.
  const aesKey = forge.random.getBytesSync(32); // 256 bits
  const iv = forge.random.getBytesSync(12); // 96 bits para GCM

  // 2) Cifrar contenido con AES-256-GCM.
  const cipher = forge.cipher.createCipher('AES-GCM', aesKey);
  cipher.start({ iv });
  cipher.update(forge.util.createBuffer(forge.util.encodeUtf8(plainText)));
  cipher.finish();
  const cipherText = cipher.output.getBytes();
  const authTag = cipher.mode.tag.getBytes();

  // 3) Cifrar la clave AES con RSA-OAEP (clave pública).
  const encryptedKey = publicKey.encrypt(aesKey, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
  });

  return {
    encryptedKey: forge.util.encode64(encryptedKey),
    iv: forge.util.encode64(iv),
    cipherText: forge.util.encode64(cipherText),
    authTag: forge.util.encode64(authTag),
  };
}

/**
 * Descifra el contenido usando la clave privada RSA del dispositivo.
 */
export async function decryptContent(encrypted) {
  const privateKeyPem = await getPrivateKey();
  if (!privateKeyPem) throw new Error('No hay clave privada en el dispositivo');
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

  // 1) Recuperar la clave AES descifrando con RSA.
  const aesKey = privateKey.decrypt(forge.util.decode64(encrypted.encryptedKey), 'RSA-OAEP', {
    md: forge.md.sha256.create(),
  });

  // 2) Descifrar el contenido con AES-256-GCM verificando la etiqueta.
  const decipher = forge.cipher.createDecipher('AES-GCM', aesKey);
  decipher.start({
    iv: forge.util.decode64(encrypted.iv),
    tag: forge.util.createBuffer(forge.util.decode64(encrypted.authTag)),
  });
  decipher.update(forge.util.createBuffer(forge.util.decode64(encrypted.cipherText)));
  const ok = decipher.finish();
  if (!ok) throw new Error('Fallo de integridad al descifrar la nota');

  return forge.util.decodeUtf8(decipher.output.getBytes());
}
