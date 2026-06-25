import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store/useStore.js";
import { useCanvasGestures } from "../hooks/useCanvasGestures.js";
import { useImageInsert } from "../hooks/useImageInsert.js";
import { screenToWorld, resolveArrow, arrowHead } from "../utils/geometry.js";
import { imageFilesFrom } from "../utils/files.js";
import Grid from "./Grid.jsx";
import Toolbar from "./Toolbar.jsx";
import Topbar from "../components/Topbar.jsx";
import SelectionOverlay from "./SelectionOverlay.jsx";
import FormatToolbar from "./FormatToolbar.jsx";
import TextObject from "./objects/TextObject.jsx";
import ImageObject from "./objects/ImageObject.jsx";
import ShapeObject from "./objects/ShapeObject.jsx";
import Connector from "./objects/Connector.jsx";

const WORLD = 500000; // half-extent of the SVG plane (world units)

// keyboard letter -> tool
const TOOL_KEYS = { v: "select", h: "hand", t: "text", r: "rectangle", o: "circle", l: "line", a: "arrow" };

export default function Canvas({ note, sidebarCollapsed }) {
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const spaceRef = useRef(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);

  const objects = useStore((s) => s.objects);
  const camera = useStore((s) => s.camera);
  const selection = useStore((s) => s.selection);
  const tool = useStore((s) => s.tool);
  const blobURLs = useStore((s) => s.blobURLs);
  const setTool = useStore((s) => s.setTool);
  const updateObject = useStore((s) => s.updateObject);
  const beginInteraction = useStore((s) => s.beginInteraction);

  const insertImages = useImageInsert();
  const gestures = useCanvasGestures(containerRef, spaceRef);
  const { onPointerDown, startResize, startEndpointDrag, marquee, draftConn, snapId, editingId, setEditingId } = gestures;

  const byId = useMemo(() => Object.fromEntries(objects.map((o) => [o.id, o])), [objects]);
  const svgObjects = objects.filter((o) => ["rectangle", "circle", "line", "arrow"].includes(o.type));
  const htmlObjects = objects.filter((o) => o.type === "text" || o.type === "image");
  const editingObj = editingId ? byId[editingId] : null;

  // Wheel: ctrl/meta -> zoom to cursor, otherwise pan. Native listener so we can
  // preventDefault the browser's pinch-zoom / scroll.
  useEffect(() => {
    const el = containerRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      const st = useStore.getState();
      const rect = el.getBoundingClientRect();
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (e.ctrlKey || e.metaKey) {
        st.zoomAt(point, Math.pow(1.0015, -e.deltaY));
      } else {
        st.panBy(-e.deltaX, -e.deltaY);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Space to pan + single-key tool switches.
  useEffect(() => {
    const isEditing = () =>
      document.activeElement &&
      (document.activeElement.isContentEditable ||
        ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName));

    const down = (e) => {
      if (e.key === "Shift" && !isEditing()) setShiftHeld(true);
      if (e.code === "Space" && !isEditing()) {
        spaceRef.current = true;
        setSpaceHeld(true);
        e.preventDefault();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isEditing()) return;
      const t = TOOL_KEYS[e.key.toLowerCase()];
      if (t) setTool(t);
    };
    const up = (e) => {
      if (e.key === "Shift") setShiftHeld(false);
      if (e.code === "Space") {
        spaceRef.current = false;
        setSpaceHeld(false);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [setTool]);

  const worldAtClient = (clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect();
    return screenToWorld({ x: clientX - rect.left, y: clientY - rect.top }, useStore.getState().camera);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const imgs = imageFilesFrom(e.dataTransfer);
    if (imgs.length) insertImages(imgs, worldAtClient(e.clientX, e.clientY));
  };

  const onImagePick = (e) => {
    const files = [...(e.target.files ?? [])];
    if (files.length) {
      const center = screenToWorld(
        { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        camera
      );
      insertImages(files, center);
    }
    e.target.value = "";
  };

  const startEdit = (id) => {
    beginInteraction();
    setEditingId(id);
  };

  const cursorClass =
    spaceHeld || shiftHeld || tool === "hand"
      ? "is-pan"
      : ["rectangle", "circle", "line", "arrow", "text"].includes(tool)
        ? "is-draw"
        : "";

  return (
    <div className={`canvas-area ${sidebarCollapsed ? "is-sidebar-collapsed" : ""}`}>
      <Topbar note={note} />
      <Toolbar tool={tool} setTool={setTool} onPickImage={() => fileInputRef.current?.click()} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={onImagePick}
      />

      <div
        ref={containerRef}
        className={`canvas-viewport ${cursorClass}`}
        onPointerDown={onPointerDown}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <Grid camera={camera} show />

        {/* World layer: everything below is in world coordinates */}
        <div
          className="world"
          style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}
        >
          <svg
            className="world-svg"
            style={{ left: -WORLD, top: -WORLD, width: WORLD * 2, height: WORLD * 2 }}
            viewBox={`${-WORLD} ${-WORLD} ${WORLD * 2} ${WORLD * 2}`}
          >
            {svgObjects.map((o) =>
              o.type === "rectangle" || o.type === "circle" ? (
                <ShapeObject key={o.id} obj={o} />
              ) : (
                <Connector key={o.id} obj={o} objectsById={byId} />
              )
            )}
            {draftConn && <DraftConnector draft={draftConn} />}
          </svg>

          {htmlObjects.map((o) =>
            o.type === "text" ? (
              <TextObject
                key={o.id}
                obj={o}
                editing={editingId === o.id}
                onStartEdit={startEdit}
                onChangeText={(id, html) => updateObject(id, { html })}
                onMeasure={(h) => updateObject(o.id, { h })}
              />
            ) : (
              <ImageObject key={o.id} obj={o} url={blobURLs[o.blobId]} />
            )
          )}
        </div>

        <SelectionOverlay
          camera={camera}
          objects={objects}
          selection={selection}
          snapId={snapId}
          marquee={marquee}
          startResize={startResize}
          startEndpointDrag={startEndpointDrag}
        />
      </div>

      {editingObj && editingObj.type === "text" && (
        <FormatToolbar obj={editingObj} camera={camera} setObject={updateObject} />
      )}
    </div>
  );
}

/** Dashed preview of a connector while it's being drawn. */
function DraftConnector({ draft }) {
  const { a, b, shape } = draft;
  const head = shape === "arrow" ? arrowHead(a, b, 11) : null;
  return (
    <g className="draft-conn">
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} vectorEffect="non-scaling-stroke" />
      {head && <polygon points={head.map((p) => `${p.x},${p.y}`).join(" ")} />}
    </g>
  );
}
