import { db } from "./database.js";
import { uid } from "../utils/id.js";

const emptyCanvas = (noteId) => ({
  noteId,
  objects: [],
  camera: { x: 0, y: 0, zoom: 1 },
});

export async function createNote(title = "Untitled") {
  const now = Date.now();
  const note = { id: uid(), title, createdAt: now, updatedAt: now };
  await db.transaction("rw", db.notes, db.canvases, async () => {
    await db.notes.add(note);
    await db.canvases.add(emptyCanvas(note.id));
  });
  return note;
}

export async function renameNote(id, title) {
  await db.notes.update(id, { title, updatedAt: Date.now() });
}

export async function touchNote(id) {
  await db.notes.update(id, { updatedAt: Date.now() });
}

export async function deleteNote(id) {
  await db.transaction("rw", db.notes, db.canvases, db.blobs, async () => {
    const canvas = await db.canvases.get(id);
    const blobIds = (canvas?.objects ?? [])
      .map((o) => o.blobId)
      .filter(Boolean);
    if (blobIds.length) await db.blobs.bulkDelete(blobIds);
    await db.canvases.delete(id);
    await db.notes.delete(id);
  });
}

export async function loadCanvas(noteId) {
  const canvas = await db.canvases.get(noteId);
  return canvas ?? emptyCanvas(noteId);
}

/** Persist the full canvas document. `touch` bumps the note's updatedAt — we
 *  only do that for real content edits, not camera-only changes (pan/zoom). */
export async function saveCanvas(noteId, { objects, camera }, touch = true) {
  await db.transaction("rw", db.notes, db.canvases, async () => {
    await db.canvases.put({ noteId, objects, camera });
    if (touch) await db.notes.update(noteId, { updatedAt: Date.now() });
  });
}
