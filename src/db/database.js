import Dexie from "dexie";

/**
 * Single local database for the whole app.
 *
 * Tables
 *  - notes:     lightweight metadata for the sidebar (id, title, timestamps)
 *  - canvases:  the heavy per-note document (objects array + camera)
 *  - blobs:     binary image / gif data, referenced by object.blobId
 *
 * Splitting metadata from the canvas doc keeps the sidebar fast (it only
 * ever reads/searches `notes`) while the large canvas payload is loaded
 * lazily, on open.
 */
export const db = new Dexie("canvas-notes");

db.version(1).stores({
  notes: "id, updatedAt, title",
  canvases: "noteId",
  blobs: "id",
});

export default db;
