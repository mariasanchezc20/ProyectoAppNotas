import NetInfo from '@react-native-community/netinfo';
import { apiSync } from '../api/notesApi';
import {
  getLocalNotes,
  saveLocalNotes,
  getLastSyncAt,
  setLastSyncAt,
} from '../storage/localNotes';

/**
 * F-07: Sincroniza las notas locales con el servidor cuando hay conexión.
 *
 * 1. Recoge los cambios pendientes locales (create/update/delete).
 * 2. Los envía al endpoint /sync junto a lastSyncAt.
 * 3. Aplica la respuesta del servidor a la cache local (incluye notas de otros dispositivos).
 */
export async function syncNotes() {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    return { skipped: true, reason: 'offline' };
  }

  const localNotes = await getLocalNotes();
  const lastSyncAt = await getLastSyncAt();

  const upserts = localNotes
    .filter((n) => n.pending === 'create' || n.pending === 'update')
    .map((n) => ({
      clientId: n.clientId,
      title: n.title,
      category: n.category,
      content: n.content, // ya cifrado
      version: n.version || 1,
    }));

  const deletes = localNotes
    .filter((n) => n.pending === 'delete')
    .map((n) => n.clientId);

  const result = await apiSync({ upserts, deletes, lastSyncAt });

  // Reconciliar: partimos de la lista local y aplicamos los cambios del servidor.
  const byClientId = new Map(localNotes.map((n) => [n.clientId, n]));

  // Notas confirmadas por el servidor (las creadas/actualizadas).
  for (const applied of result.applied) {
    const existing = byClientId.get(applied.clientId) || {};
    byClientId.set(applied.clientId, {
      ...existing,
      ...applied,
      serverId: applied.id,
      pending: null,
    });
  }

  // Borrados confirmados: se eliminan de la cache local.
  for (const clientId of result.deleted) {
    byClientId.delete(clientId);
  }

  // Cambios provenientes del servidor (p. ej., otro dispositivo).
  for (const change of result.serverChanges) {
    if (change.isDeleted) {
      if (change.clientId) byClientId.delete(change.clientId);
      // borrar también por serverId
      for (const [k, v] of byClientId) {
        if (v.serverId === change.id) byClientId.delete(k);
      }
      continue;
    }
    const key = change.clientId || change.id;
    const existing = byClientId.get(key) || {};
    // No pisar cambios locales aún sin sincronizar.
    if (existing.pending) continue;
    byClientId.set(key, {
      ...existing,
      ...change,
      clientId: key,
      serverId: change.id,
      pending: null,
    });
  }

  const merged = Array.from(byClientId.values());
  await saveLocalNotes(merged);
  await setLastSyncAt(result.serverTime);

  return { skipped: false, count: merged.length };
}

/**
 * Suscribe la sincronización automática a los cambios de conectividad.
 * Devuelve una función para cancelar la suscripción.
 */
export function startAutoSync(onSynced) {
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      syncNotes()
        .then((r) => onSynced && onSynced(r))
        .catch((e) => console.warn('[sync] error:', e.message));
    }
  });
  return unsubscribe;
}
