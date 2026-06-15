import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * F-07: Cache local de notas para funcionar sin conexión.
 *
 * Cada nota local guarda el contenido CIFRADO (igual que en el servidor) más
 * metadatos de sincronización:
 *   - clientId: id estable generado en el dispositivo.
 *   - serverId: id en el servidor (null si aún no se ha sincronizado).
 *   - pending: 'create' | 'update' | 'delete' | null  -> cambios sin enviar.
 *   - version: para resolución de conflictos.
 */

const NOTES_KEY = 'local_notes';
const LAST_SYNC_KEY = 'last_sync_at';

export async function getLocalNotes() {
  const raw = await AsyncStorage.getItem(NOTES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveLocalNotes(notes) {
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export async function upsertLocalNote(note) {
  const notes = await getLocalNotes();
  const idx = notes.findIndex((n) => n.clientId === note.clientId);
  if (idx >= 0) notes[idx] = note;
  else notes.push(note);
  await saveLocalNotes(notes);
  return note;
}

export async function removeLocalNote(clientId) {
  const notes = await getLocalNotes();
  await saveLocalNotes(notes.filter((n) => n.clientId !== clientId));
}

export async function getLastSyncAt() {
  return AsyncStorage.getItem(LAST_SYNC_KEY);
}

export async function setLastSyncAt(iso) {
  await AsyncStorage.setItem(LAST_SYNC_KEY, iso);
}

export async function clearLocalNotes() {
  await AsyncStorage.multiRemove([NOTES_KEY, LAST_SYNC_KEY]);
}
