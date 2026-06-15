import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authApi from '../api/notesApi';
import { getAccessToken, clearTokens } from '../api/client';
import { ensureKeyPair, } from '../crypto/noteCrypto';
import { clearKeys, getPublicKey } from '../storage/secureKeyStore';
import { clearLocalNotes } from '../storage/localNotes';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al arrancar, comprueba si ya hay sesión.
  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          const me = await authApi.fetchMe();
          setUser(me);
        }
      } catch (_) {
        await clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signUp = useCallback(async ({ email, password }) => {
    // Genera el par RSA en el dispositivo y registra la clave pública (S-01).
    const publicKey = await ensureKeyPair();
    const res = await authApi.register({ email, password, rsaPublicKey: publicKey });
    return res; // requiere verificar correo antes de iniciar sesión
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const data = await authApi.login({ email, password });
    // Asegura que el dispositivo tenga par de claves y que el backend tenga la pública.
    const publicKey = await ensureKeyPair();
    if (!data.user.rsaPublicKey) {
      try {
        await authApi.uploadPublicKey(publicKey);
      } catch (_) {}
    }
    setUser(data.user);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout();
    await clearLocalNotes();
    setUser(null);
    // Nota: NO borramos las claves RSA por defecto, para poder descifrar al volver.
    // Si quieres "olvido total" del dispositivo, llama a clearKeys().
  }, []);

  const value = { user, loading, signUp, signIn, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
