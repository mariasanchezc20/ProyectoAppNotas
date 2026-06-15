import { api, setTokens, clearTokens, getRefreshToken } from './client';

// ---- Auth ----

export async function register({ email, password, rsaPublicKey }) {
  const { data } = await api.post('/api/auth/register', { email, password, rsaPublicKey });
  return data;
}

export async function login({ email, password }) {
  const { data } = await api.post('/api/auth/login', { email, password });
  await setTokens(data);
  return data;
}

export async function logout() {
  try {
    const refreshToken = await getRefreshToken();
    await api.post('/api/auth/logout', { refreshToken });
  } catch (_) {
    // Ignorar errores de red al cerrar sesión.
  } finally {
    await clearTokens();
  }
}

export async function uploadPublicKey(rsaPublicKey) {
  const { data } = await api.post('/api/auth/public-key', { rsaPublicKey });
  return data;
}

export async function fetchMe() {
  const { data } = await api.get('/api/auth/me');
  return data.user;
}

// ---- Notas ----

export async function apiListNotes() {
  const { data } = await api.get('/api/notes');
  return data.notes;
}

export async function apiCreateNote(payload) {
  const { data } = await api.post('/api/notes', payload);
  return data.note;
}

export async function apiUpdateNote(id, payload) {
  const { data } = await api.put(`/api/notes/${id}`, payload);
  return data.note;
}

export async function apiDeleteNote(id) {
  const { data } = await api.delete(`/api/notes/${id}`);
  return data;
}

export async function apiSearchNotes({ q, category }) {
  const { data } = await api.get('/api/notes/search', { params: { q, category } });
  return data.notes;
}

export async function apiSync({ upserts, deletes, lastSyncAt }) {
  const { data } = await api.post('/api/notes/sync', { upserts, deletes, lastSyncAt });
  return data;
}
