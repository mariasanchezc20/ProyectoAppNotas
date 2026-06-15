const Note = require('../models/Note');

/**
 * F-03: Crear nota. El contenido llega ya cifrado desde el cliente.
 */
async function createNote(req, res, next) {
  try {
    const { title, category, content, clientId } = req.body;

    const note = await Note.create({
      owner: req.user._id,
      title,
      category: category || 'General',
      content,
      clientId: clientId || undefined,
      version: 1,
    });

    return res.status(201).json({ note: note.toClientJSON() });
  } catch (err) {
    next(err);
  }
}

/**
 * Lista las notas del usuario (no borradas).
 */
async function listNotes(req, res, next) {
  try {
    const notes = await Note.find({ owner: req.user._id, isDeleted: false }).sort({
      updatedAt: -1,
    });
    return res.json({ notes: notes.map((n) => n.toClientJSON()) });
  } catch (err) {
    next(err);
  }
}

async function getNote(req, res, next) {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      owner: req.user._id,
      isDeleted: false,
    });
    if (!note) return res.status(404).json({ message: 'Nota no encontrada' });
    return res.json({ note: note.toClientJSON() });
  } catch (err) {
    next(err);
  }
}

/**
 * F-04: Actualizar nota. Solo el dueño puede modificarla.
 */
async function updateNote(req, res, next) {
  try {
    const { title, category, content } = req.body;

    const note = await Note.findOne({
      _id: req.params.id,
      owner: req.user._id,
      isDeleted: false,
    });
    if (!note) return res.status(404).json({ message: 'Nota no encontrada' });

    if (title !== undefined) note.title = title;
    if (category !== undefined) note.category = category;
    if (content !== undefined) note.content = content;
    note.version += 1;
    await note.save();

    return res.json({ note: note.toClientJSON() });
  } catch (err) {
    next(err);
  }
}

/**
 * F-05: Eliminar nota (borrado lógico para propagar entre dispositivos).
 */
async function deleteNote(req, res, next) {
  try {
    const note = await Note.findOne({ _id: req.params.id, owner: req.user._id });
    if (!note || note.isDeleted) {
      return res.status(404).json({ message: 'Nota no encontrada' });
    }
    note.isDeleted = true;
    note.deletedAt = new Date();
    note.version += 1;
    await note.save();
    return res.json({ message: 'Nota eliminada' });
  } catch (err) {
    next(err);
  }
}

/**
 * F-06: Buscar notas por título o categoría (en el servidor).
 * NOTA: el contenido está cifrado, por lo que la búsqueda por contenido
 * debe realizarse en el cliente sobre las notas descifradas.
 */
async function searchNotes(req, res, next) {
  try {
    const { q, category } = req.query;
    const filter = { owner: req.user._id, isDeleted: false };

    if (category) {
      filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
    }

    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ title: rx }, { category: rx }];
    }

    const notes = await Note.find(filter).sort({ updatedAt: -1 });
    return res.json({ notes: notes.map((n) => n.toClientJSON()) });
  } catch (err) {
    next(err);
  }
}

/**
 * F-07: Sincronización. El cliente envía:
 *  - upserts: notas creadas/editadas offline (con clientId).
 *  - deletes: ids de notas borradas offline.
 *  - lastSyncAt: para devolver solo los cambios del servidor desde esa fecha.
 * Estrategia de conflicto: last-write-wins por número de versión.
 */
async function syncNotes(req, res, next) {
  try {
    const { upserts = [], deletes = [], lastSyncAt } = req.body;
    const ownerId = req.user._id;
    const results = { applied: [], deleted: [] };

    // 1) Aplicar upserts del cliente
    for (const item of upserts) {
      if (!item || !item.clientId || !item.content || !item.title) continue;

      const existing = await Note.findOne({ owner: ownerId, clientId: item.clientId });
      if (existing) {
        // Resolución de conflicto last-write-wins por versión.
        if ((item.version || 0) >= existing.version) {
          existing.title = item.title;
          existing.category = item.category || existing.category;
          existing.content = item.content;
          existing.version = (item.version || existing.version) + 1;
          existing.isDeleted = false;
          await existing.save();
          results.applied.push(existing.toClientJSON());
        } else {
          results.applied.push(existing.toClientJSON());
        }
      } else {
        const created = await Note.create({
          owner: ownerId,
          clientId: item.clientId,
          title: item.title,
          category: item.category || 'General',
          content: item.content,
          version: item.version || 1,
        });
        results.applied.push(created.toClientJSON());
      }
    }

    // 2) Aplicar borrados del cliente
    for (const clientId of deletes) {
      const note = await Note.findOne({ owner: ownerId, clientId });
      if (note && !note.isDeleted) {
        note.isDeleted = true;
        note.deletedAt = new Date();
        note.version += 1;
        await note.save();
        results.deleted.push(clientId);
      }
    }

    // 3) Devolver cambios del servidor desde la última sincronización
    const since = lastSyncAt ? new Date(lastSyncAt) : new Date(0);
    const serverChanges = await Note.find({
      owner: ownerId,
      updatedAt: { $gt: since },
    }).sort({ updatedAt: 1 });

    return res.json({
      serverTime: new Date().toISOString(),
      applied: results.applied,
      deleted: results.deleted,
      serverChanges: serverChanges.map((n) => n.toClientJSON()),
    });
  } catch (err) {
    next(err);
  }
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  createNote,
  listNotes,
  getNote,
  updateNote,
  deleteNote,
  searchNotes,
  syncNotes,
};
