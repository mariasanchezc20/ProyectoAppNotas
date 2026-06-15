import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { encryptContent, decryptContent } from '../crypto/noteCrypto';
import { getPublicKey } from '../storage/secureKeyStore';
import {
  getLocalNotes,
  upsertLocalNote,
  removeLocalNote,
} from '../storage/localNotes';
import { syncNotes, startAutoSync } from '../storage/syncService';

const NotesContext = createContext(null);

export function NotesProvider({ children }) {
  // notas en memoria YA descifradas para mostrar en la UI.
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const reload = useCallback(async () => {
    const local = await getLocalNotes();
    const visible = local.filter((n) => n.pending !== 'delete');

    // Descifra el contenido de cada nota para mostrarlo (S-01: solo en el dispositivo).
    const decrypted = await Promise.all(
      visible.map(async (n) => {
        let plain = '';
        try {
          plain = n.content ? await decryptContent(n.content) : '';
        } catch (e) {
          plain = '[No se pudo descifrar]';
        }
        return { ...n, plainContent: plain };
      })
    );
    decrypted.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    setNotes(decrypted);
  }, []);

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
    })();

    // F-07: sincroniza automáticamente al recuperar conexión.
    const unsubscribe = startAutoSync(async () => {
      await reload();
    });
    // Intento inicial de sync.
    triggerSync().finally(reload);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncNotes();
      await reload();
    } catch (e) {
      console.warn('[notes] sync error:', e.message);
    } finally {
      setSyncing(false);
    }
  }, [reload]);

  // F-03: crear nota (cifra el contenido antes de guardar).
  const createNote = useCallback(
    async ({ title, content, category }) => {
      const publicKey = await getPublicKey();
      const encrypted = encryptContent(content || '', publicKey);
      const now = new Date().toISOString();
      const note = {
        clientId: uuidv4(),
        serverId: null,
        title,
        category: category || 'General',
        content: encrypted,
        version: 1,
        pending: 'create',
        createdAt: now,
        updatedAt: now,
      };
      await upsertLocalNote(note);
      await reload();
      triggerSync();
      return note;
    },
    [reload, triggerSync]
  );

  // F-04: actualizar nota.
  const updateNote = useCallback(
    async (clientId, { title, content, category }) => {
      const local = await getLocalNotes();
      const target = local.find((n) => n.clientId === clientId);
      if (!target) return;
      const publicKey = await getPublicKey();
      const encrypted =
        content !== undefined ? encryptContent(content, publicKey) : target.content;
      const updated = {
        ...target,
        title: title ?? target.title,
        category: category ?? target.category,
        content: encrypted,
        version: (target.version || 1) + 1,
        pending: target.pending === 'create' ? 'create' : 'update',
        updatedAt: new Date().toISOString(),
      };
      await upsertLocalNote(updated);
      await reload();
      triggerSync();
    },
    [reload, triggerSync]
  );

  // F-05: eliminar nota (marca para borrar y propaga al servidor).
  const deleteNote = useCallback(
    async (clientId) => {
      const local = await getLocalNotes();
      const target = local.find((n) => n.clientId === clientId);
      if (!target) return;
      if (!target.serverId && target.pending === 'create') {
        // Nunca llegó al servidor: se borra directamente.
        await removeLocalNote(clientId);
      } else {
        await upsertLocalNote({ ...target, pending: 'delete', updatedAt: new Date().toISOString() });
      }
      await reload();
      triggerSync();
    },
    [reload, triggerSync]
  );

  // F-06: búsqueda local (incluye contenido descifrado, que el servidor no puede ver).
  const searchNotes = useCallback(
    (query) => {
      const q = (query || '').trim().toLowerCase();
      if (!q) return notes;
      return notes.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.category?.toLowerCase().includes(q) ||
          n.plainContent?.toLowerCase().includes(q)
      );
    },
    [notes]
  );

  const value = {
    notes,
    loading,
    syncing,
    createNote,
    updateNote,
    deleteNote,
    searchNotes,
    reload,
    triggerSync,
  };
  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes debe usarse dentro de NotesProvider');
  return ctx;
}
