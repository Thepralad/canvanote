import { db } from "./database.js";
import { uid } from "../utils/id.js";

/**
 * Image / GIF bytes live here as real Blobs. Objects on the canvas only keep
 * a `blobId`. We hand out object URLs for rendering and cache them per session
 * so the same blob isn't re-materialised on every render.
 */
const urlCache = new Map(); // blobId -> objectURL

export async function putBlob(blob) {
  const id = uid();
  await db.blobs.add({ id, blob });
  return id;
}

export async function getBlobURL(blobId) {
  if (!blobId) return null;
  if (urlCache.has(blobId)) return urlCache.get(blobId);
  const row = await db.blobs.get(blobId);
  if (!row) return null;
  const url = URL.createObjectURL(row.blob);
  urlCache.set(blobId, url);
  return url;
}

/** Resolve a list of blobIds to URLs at once (used when opening a note). */
export async function resolveBlobURLs(blobIds) {
  const map = {};
  await Promise.all(
    [...new Set(blobIds.filter(Boolean))].map(async (id) => {
      map[id] = await getBlobURL(id);
    })
  );
  return map;
}

export function revokeAllURLs() {
  for (const url of urlCache.values()) URL.revokeObjectURL(url);
  urlCache.clear();
}
