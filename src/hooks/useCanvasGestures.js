import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../store/useStore.js";
import {
  screenToWorld,
  rectFromPoints,
  boxesIntersect,
  boxOf,
  hitTest,
  clamp,
} from "../utils/geometry.js";
import {
  createBoxShape,
  createConnector,
  pointEnd,
  boundEnd,
  createText,
} from "../canvas/createObject.js";
import { MIN_SIZE, SNAP_DISTANCE, DEFAULTS } from "../utils/constants.js";

const DRAG_THRESHOLD = 3; // screen px before a press counts as a drag

/**
 * The canvas interaction engine. One pointer-down classifies into a gesture
 * (pan / move / marquee / resize / draw shape / draw connector), then window
 * pointer move/up listeners run it to completion. Keeping all of this in a hook
 * keeps the Canvas component declarative.
 */
export function useCanvasGestures(containerRef, spaceRef) {
  const gesture = useRef(null);
  const [marquee, setMarquee] = useState(null); // screen-space rect
  const [draftConn, setDraftConn] = useState(null); // { shape, a, b } world coords
  const [snapId, setSnapId] = useState(null); // object highlighted for binding
  const [editingId, setEditingId] = useState(null);

  const screenPoint = useCallback(
    (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    [containerRef]
  );

  // ----- gesture starters exposed to the overlay -----------------------------
  const startResize = useCallback((e, id, handle) => {
    e.stopPropagation();
    const obj = useStore.getState().objects.find((o) => o.id === id);
    if (!obj) return;
    gesture.current = {
      kind: "resize",
      id,
      handle,
      origin: boxOf(obj),
      startScreen: screenPoint(e),
      snapshotted: false,
    };
  }, [screenPoint]);

  const startEndpointDrag = useCallback((e, id, which) => {
    e.stopPropagation();
    gesture.current = { kind: "endpoint", id, which, snapshotted: false };
  }, []);

  // ----- main pointer-down on the canvas -------------------------------------
  const onPointerDown = useCallback(
    (e) => {
      if (e.target.isContentEditable) return; // editing a text box
      const st = useStore.getState();
      const screen = screenPoint(e);
      const world = screenToWorld(screen, st.camera);
      const objEl = e.target.closest?.("[data-object-id]");
      const objectId = objEl?.getAttribute("data-object-id") ?? null;

      // Leaving an active text edit when clicking elsewhere.
      if (editingId && objectId !== editingId) setEditingId(null);

      const wantPan = e.button === 1 || spaceRef.current || st.tool === "hand";
      if (wantPan) {
        gesture.current = { kind: "pan", last: screen };
        return;
      }

      switch (st.tool) {
        case "text": {
          const obj = st.addObject(createText(world));
          setEditingId(obj.id);
          st.setTool("select");
          return;
        }
        case "rectangle":
        case "circle": {
          gesture.current = {
            kind: "draw",
            shape: st.tool,
            start: world,
            id: null,
            moved: false,
          };
          return;
        }
        case "line":
        case "arrow": {
          const padW = SNAP_DISTANCE / st.camera.zoom;
          const hit = hitTest(world, st.objects, padW);
          gesture.current = {
            kind: "drawConn",
            shape: st.tool,
            startBinding: hit ? boundEnd(hit.id) : null,
            startWorld: world,
            endWorld: world,
            endHit: null,
          };
          setDraftConn({ shape: st.tool, a: world, b: world });
          setSnapId(hit?.id ?? null);
          return;
        }
        default: {
          // select tool
          if (objectId) {
            if (e.shiftKey) st.toggleSelection(objectId);
            else if (!st.selection.includes(objectId)) st.select([objectId]);
            gesture.current = {
              kind: "move",
              startScreen: screen,
              origins: null,
              moved: false,
              snapshotted: false,
            };
          } else if (e.shiftKey) {
            // Shift + drag on empty canvas pans (like Space / Hand tool).
            gesture.current = { kind: "pan", last: screen };
          } else {
            st.clearSelection();
            gesture.current = {
              kind: "marquee",
              startWorld: world,
              startScreen: screen,
              base: [],
            };
          }
        }
      }
    },
    [screenPoint, spaceRef, editingId]
  );

  // ----- window move / up: run the active gesture ----------------------------
  useEffect(() => {
    const onMove = (e) => {
      const g = gesture.current;
      if (!g) return;
      const st = useStore.getState();
      const rect = containerRef.current.getBoundingClientRect();
      const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const world = screenToWorld(screen, st.camera);

      switch (g.kind) {
        case "pan": {
          st.panBy(screen.x - g.last.x, screen.y - g.last.y);
          g.last = screen;
          break;
        }
        case "move": {
          const dx = (screen.x - g.startScreen.x) / st.camera.zoom;
          const dy = (screen.y - g.startScreen.y) / st.camera.zoom;
          if (!g.moved && Math.hypot(screen.x - g.startScreen.x, screen.y - g.startScreen.y) < DRAG_THRESHOLD)
            break;
          if (!g.snapshotted) {
            st.beginInteraction();
            g.snapshotted = true;
            g.origins = captureOrigins(st);
          }
          g.moved = true;
          st.updateObjects(buildMovePatch(g.origins, dx, dy));
          break;
        }
        case "resize": {
          if (!g.snapshotted) {
            st.beginInteraction();
            g.snapshotted = true;
          }
          const dx = (screen.x - g.startScreen.x) / st.camera.zoom;
          const dy = (screen.y - g.startScreen.y) / st.camera.zoom;
          st.updateObject(g.id, resizeBox(g.origin, g.handle, dx, dy));
          break;
        }
        case "draw": {
          if (!g.id) {
            const moved = Math.hypot(world.x - g.start.x, world.y - g.start.y);
            if (moved < DRAG_THRESHOLD / st.camera.zoom) break;
            const obj = st.addObject(createBoxShape(g.shape, g.start, world));
            g.id = obj.id;
            g.moved = true;
          } else {
            const box = createBoxShape(g.shape, g.start, world);
            st.updateObject(g.id, { x: box.x, y: box.y, w: box.w, h: box.h });
          }
          break;
        }
        case "drawConn": {
          const padW = SNAP_DISTANCE / st.camera.zoom;
          const hit = hitTest(world, st.objects, padW);
          g.endWorld = world;
          g.endHit = hit ? hit.id : null;
          setDraftConn({ shape: g.shape, a: g.startWorld, b: world });
          setSnapId(hit?.id ?? null);
          break;
        }
        case "endpoint": {
          if (!g.snapshotted) {
            st.beginInteraction();
            g.snapshotted = true;
          }
          const padW = SNAP_DISTANCE / st.camera.zoom;
          const hit = hitTest(world, st.objects, padW);
          const end = hit && hit.id !== g.id ? boundEnd(hit.id) : pointEnd(world);
          st.updateObject(g.id, { [g.which]: end });
          setSnapId(hit && hit.id !== g.id ? hit.id : null);
          break;
        }
        case "marquee": {
          const r = rectFromPoints(g.startScreen, screen);
          setMarquee(r);
          const worldRect = rectFromPoints(g.startWorld, world);
          const inside = st.objects
            .filter((o) => o.type !== "arrow" && o.type !== "line")
            .filter((o) => boxesIntersect(worldRect, boxOf(o)))
            .map((o) => o.id);
          st.select([...new Set([...g.base, ...inside])]);
          break;
        }
        default:
          break;
      }
    };

    const onUp = () => {
      const g = gesture.current;
      gesture.current = null;
      setMarquee(null);
      setSnapId(null);

      if (g?.kind === "draw" && !g.id) {
        // a click without drag drops a default-sized shape
        const st = useStore.getState();
        const d = DEFAULTS[g.shape];
        st.addObject({
          ...createBoxShape(
            g.shape,
            g.start,
            { x: g.start.x + d.w, y: g.start.y + d.h }
          ),
        });
        st.setTool("select");
      } else if (g?.kind === "draw") {
        useStore.getState().setTool("select");
      }

      if (g?.kind === "drawConn") {
        const st = useStore.getState();
        const len = Math.hypot(g.endWorld.x - g.startWorld.x, g.endWorld.y - g.startWorld.y);
        const bound = g.startBinding || g.endHit;
        if (len > 6 || bound) {
          const start = g.startBinding ?? pointEnd(g.startWorld);
          const end = g.endHit ? boundEnd(g.endHit) : pointEnd(g.endWorld);
          st.addObject(createConnector(g.shape, start, end));
        }
        st.setTool("select");
        setDraftConn(null);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [containerRef]);

  return {
    onPointerDown,
    startResize,
    startEndpointDrag,
    marquee,
    draftConn,
    snapId,
    editingId,
    setEditingId,
  };
}

// --- helpers -----------------------------------------------------------------

function captureOrigins(st) {
  const sel = new Set(st.selection);
  const origins = {};
  for (const o of st.objects) {
    if (!sel.has(o.id)) continue;
    if (o.type === "arrow" || o.type === "line") {
      origins[o.id] = { start: { ...o.start }, end: { ...o.end } };
    } else {
      origins[o.id] = { x: o.x, y: o.y };
    }
  }
  return origins;
}

function buildMovePatch(origins, dx, dy) {
  const patch = {};
  for (const id in origins) {
    const o = origins[id];
    if (o.start) {
      patch[id] = {
        start: shiftEnd(o.start, dx, dy),
        end: shiftEnd(o.end, dx, dy),
      };
    } else {
      patch[id] = { x: o.x + dx, y: o.y + dy };
    }
  }
  return patch;
}

// Free endpoints move with the drag; bound endpoints stay attached to their obj.
function shiftEnd(end, dx, dy) {
  if (end.kind === "point") return { kind: "point", x: end.x + dx, y: end.y + dy };
  return end;
}

function resizeBox(origin, handle, dx, dy) {
  let { x, y, w, h } = origin;
  if (handle.includes("e")) w = origin.w + dx;
  if (handle.includes("s")) h = origin.h + dy;
  if (handle.includes("w")) {
    w = origin.w - dx;
    x = origin.x + dx;
  }
  if (handle.includes("n")) {
    h = origin.h - dy;
    y = origin.y + dy;
  }
  // clamp to a minimum, keeping the anchored edge fixed
  if (w < MIN_SIZE) {
    if (handle.includes("w")) x = origin.x + origin.w - MIN_SIZE;
    w = MIN_SIZE;
  }
  if (h < MIN_SIZE) {
    if (handle.includes("n")) y = origin.y + origin.h - MIN_SIZE;
    h = MIN_SIZE;
  }
  return { x, y, w, h };
}
