import { create } from "zustand";
import { uid } from "../utils/id.js";
import { clamp } from "../utils/geometry.js";
import { ZOOM_MIN, ZOOM_MAX } from "../utils/constants.js";

const clone = (v) =>
  typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v));

const HISTORY_LIMIT = 100;

/**
 * Object model (world coordinates):
 *   { id, type, x, y, w, h, ...typeSpecific }
 *   type: 'text' | 'image' | 'rectangle' | 'circle' | 'line' | 'arrow'
 *
 * Arrows are special: instead of w/h they hold two endpoints, each either a
 * free point or a binding to another object:
 *   { id, type:'arrow', start, end }
 *   endpoint = { kind:'point', x, y } | { kind:'bound', id, ... }
 *
 * Paint order == array order. Last object renders on top.
 */
export const useStore = create((set, get) => ({
  noteId: null,
  objects: [],
  camera: { x: 0, y: 0, zoom: 1 },
  selection: [], // array of object ids
  tool: "select",
  blobURLs: {}, // blobId -> objectURL (for images/gifs)
  clipboard: [],
  past: [],
  future: [],

  // ---- lifecycle ------------------------------------------------------------
  loadNote(noteId, { objects, camera }, blobURLs) {
    set({
      noteId,
      objects: objects ?? [],
      camera: camera ?? { x: 0, y: 0, zoom: 1 },
      blobURLs: blobURLs ?? {},
      selection: [],
      tool: "select",
      past: [],
      future: [],
    });
  },

  // ---- history --------------------------------------------------------------
  _snapshot() {
    const { objects, past } = get();
    const next = [...past, clone(objects)];
    if (next.length > HISTORY_LIMIT) next.shift();
    set({ past: next, future: [] });
  },
  /** Capture a single undo point before a multi-step interaction (drag/resize). */
  beginInteraction() {
    get()._snapshot();
  },
  undo() {
    const { past, future, objects } = get();
    if (!past.length) return;
    const previous = past[past.length - 1];
    set({
      objects: previous,
      past: past.slice(0, -1),
      future: [...future, clone(objects)],
      selection: get().selection.filter((id) => previous.some((o) => o.id === id)),
    });
  },
  redo() {
    const { past, future, objects } = get();
    if (!future.length) return;
    const next = future[future.length - 1];
    set({
      objects: next,
      future: future.slice(0, -1),
      past: [...past, clone(objects)],
    });
  },

  // ---- tool & camera --------------------------------------------------------
  setTool(tool) {
    set({ tool });
  },
  setCamera(camera) {
    set({ camera });
  },
  panBy(dx, dy) {
    const { camera } = get();
    set({ camera: { ...camera, x: camera.x + dx, y: camera.y + dy } });
  },
  zoomAt(screenPoint, factor) {
    const { camera } = get();
    const zoom = clamp(camera.zoom * factor, ZOOM_MIN, ZOOM_MAX);
    const wx = (screenPoint.x - camera.x) / camera.zoom;
    const wy = (screenPoint.y - camera.y) / camera.zoom;
    set({
      camera: {
        zoom,
        x: screenPoint.x - wx * zoom,
        y: screenPoint.y - wy * zoom,
      },
    });
  },
  setZoom(zoom, center) {
    const { camera } = get();
    const z = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
    const c = center ?? { x: 0, y: 0 };
    const wx = (c.x - camera.x) / camera.zoom;
    const wy = (c.y - camera.y) / camera.zoom;
    set({ camera: { zoom: z, x: c.x - wx * z, y: c.y - wy * z } });
  },

  // ---- selection ------------------------------------------------------------
  select(ids) {
    set({ selection: Array.isArray(ids) ? ids : ids == null ? [] : [ids] });
  },
  toggleSelection(id) {
    const { selection } = get();
    set({
      selection: selection.includes(id)
        ? selection.filter((s) => s !== id)
        : [...selection, id],
    });
  },
  clearSelection() {
    set({ selection: [] });
  },
  selectAll() {
    set({ selection: get().objects.map((o) => o.id) });
  },

  // ---- objects --------------------------------------------------------------
  addObject(obj, { select = true } = {}) {
    get()._snapshot();
    const withId = { id: uid(), ...obj };
    set({ objects: [...get().objects, withId] });
    if (select) set({ selection: [withId.id] });
    return withId;
  },
  addObjects(objs, { select = true } = {}) {
    get()._snapshot();
    const created = objs.map((o) => ({ id: uid(), ...o }));
    set({ objects: [...get().objects, ...created] });
    if (select) set({ selection: created.map((o) => o.id) });
    return created;
  },
  /** Patch a single object. transient=true skips history (mid-interaction). */
  updateObject(id, patch) {
    set({
      objects: get().objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    });
  },
  /** Patch many objects via id->patch map. */
  updateObjects(patchMap) {
    set({
      objects: get().objects.map((o) =>
        patchMap[o.id] ? { ...o, ...patchMap[o.id] } : o
      ),
    });
  },
  deleteSelected() {
    const { selection, objects } = get();
    if (!selection.length) return;
    get()._snapshot();
    const sel = new Set(selection);
    // also drop arrows that were bound to a deleted object
    const survives = (o) => {
      if (sel.has(o.id)) return false;
      if (o.type === "arrow") {
        if (o.start.kind === "bound" && sel.has(o.start.id)) return false;
        if (o.end.kind === "bound" && sel.has(o.end.id)) return false;
      }
      return true;
    };
    set({ objects: objects.filter(survives), selection: [] });
  },

  // ---- clipboard ------------------------------------------------------------
  copySelection() {
    const { selection, objects } = get();
    const sel = new Set(selection);
    set({ clipboard: clone(objects.filter((o) => sel.has(o.id))) });
  },
  paste(offset = { x: 24, y: 24 }) {
    const { clipboard } = get();
    if (!clipboard.length) return;
    const created = cloneWithRemap(clipboard, offset);
    get()._snapshot();
    set({
      objects: [...get().objects, ...created],
      selection: created.map((o) => o.id),
    });
  },
  duplicateSelection(offset = { x: 24, y: 24 }) {
    const { selection, objects } = get();
    const sel = new Set(selection);
    const picked = objects.filter((o) => sel.has(o.id));
    if (!picked.length) return;
    const created = cloneWithRemap(picked, offset);
    get()._snapshot();
    set({
      objects: [...objects, ...created],
      selection: created.map((o) => o.id),
    });
  },

  // ---- z-order --------------------------------------------------------------
  bringForward() {
    reorder(get, set, +1);
  },
  sendBackward() {
    reorder(get, set, -1);
  },

  // ---- blobs ----------------------------------------------------------------
  registerBlobURL(blobId, url) {
    set({ blobURLs: { ...get().blobURLs, [blobId]: url } });
  },
}));

/**
 * Clone a set of objects with fresh ids, offsetting position. Arrow bindings
 * to objects inside the set are remapped to the new copies; bindings to objects
 * outside the set are preserved (the copy stays attached to the original).
 */
function cloneWithRemap(objs, offset) {
  const idMap = {};
  for (const o of objs) idMap[o.id] = uid();
  return objs.map((o) => {
    const copy = clone(o);
    copy.id = idMap[o.id];
    if (copy.type === "arrow") {
      remapEnd(copy.start, idMap, offset);
      remapEnd(copy.end, idMap, offset);
    } else {
      copy.x += offset.x;
      copy.y += offset.y;
    }
    return copy;
  });
}

function remapEnd(end, idMap, offset) {
  if (end.kind === "bound") {
    if (idMap[end.id]) end.id = idMap[end.id]; // attach to the duplicated object
  } else {
    end.x += offset.x;
    end.y += offset.y;
  }
}

function reorder(get, set, dir) {
  const { selection, objects } = get();
  if (!selection.length) return;
  get()._snapshot();
  const arr = [...objects];
  const indices = selection
    .map((id) => arr.findIndex((o) => o.id === id))
    .filter((i) => i >= 0)
    .sort((a, b) => (dir > 0 ? b - a : a - b));
  for (const i of indices) {
    const j = i + dir;
    if (j < 0 || j >= arr.length) continue;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  set({ objects: arr });
}
