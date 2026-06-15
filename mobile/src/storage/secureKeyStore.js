import * as SecureStore from 'expo-secure-store';

/**
 * S-02: Almacenamiento seguro de claves criptográficas.
 *
 * expo-secure-store usa, por debajo:
 *   - iOS: Keychain Services
 *   - Android: KeyStore (cifrado mediante el sistema)
 *
 * Aquí guardamos la CLAVE PRIVADA RSA del usuario. Nunca debe salir del dispositivo
 * ni enviarse al servidor. La clave pública sí puede compartirse con el backend.
 */

const PRIVATE_KEY = 'rsa_private_key';
const PUBLIC_KEY = 'rsa_public_key';

export async function savePrivateKey(pem) {
  await SecureStore.setItemAsync(PRIVATE_KEY, pem, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getPrivateKey() {
  return SecureStore.getItemAsync(PRIVATE_KEY);
}

export async function savePublicKey(pem) {
  await SecureStore.setItemAsync(PUBLIC_KEY, pem, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getPublicKey() {
  return SecureStore.getItemAsync(PUBLIC_KEY);
}

export async function hasKeyPair() {
  const priv = await getPrivateKey();
  const pub = await getPublicKey();
  return Boolean(priv && pub);
}

export async function clearKeys() {
  await SecureStore.deleteItemAsync(PRIVATE_KEY);
  await SecureStore.deleteItemAsync(PUBLIC_KEY);
}
