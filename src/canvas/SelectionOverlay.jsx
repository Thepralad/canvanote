import { worldToScreen, boxOf, resolveArrow } from "../utils/geometry.js";

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const cursorFor = {
  nw: "nwse-resize", se: "nwse-resize",
  ne: "nesw-resize", sw: "nesw-resize",
  n: "ns-resize", s: "ns-resize",
  e: "ew-resize", w: "ew-resize",
};

/** Renders all selection chrome in screen space so handles keep a constant
 *  pixel size regardless of zoom. Pointer events pass through except on handles. */
export default function SelectionOverlay({
  camera,
  objects,
  selection,
  snapId,
  marquee,
  startResize,
  startEndpointDrag,
}) {
  const byId = Object.fromEntries(objects.map((o) => [o.id, o]));
  const selected = selection.map((id) => byId[id]).filter(Boolean);
  const boxObjects = selected.filter((o) => o.type !== "arrow" && o.type !== "line");
  const connectors = selected.filter((o) => o.type === "arrow" || o.type === "line");

  const screenBox = (o) => {
    const b = boxOf(o);
    const tl = worldToScreen({ x: b.x, y: b.y }, camera);
    return { left: tl.x, top: tl.y, width: b.w * camera.zoom, height: b.h * camera.zoom };
  };

  return (
    <div className="selection-overlay">
      {/* Snap highlight while drawing/binding a connector */}
      {snapId && byId[snapId] && (
        <div className="snap-highlight" style={frame(screenBox(byId[snapId]))} />
      )}

      {/* Bounding outlines for selected box objects */}
      {boxObjects.map((o) => (
        <div key={o.id} className="sel-box" style={frame(screenBox(o))} />
      ))}

      {/* Resize handles only for a single box object (keeps multi-select simple) */}
      {boxObjects.length === 1 &&
        HANDLES.map((h) => {
          const b = screenBox(boxObjects[0]);
          const pos = handlePos(b, h);
          return (
            <div
              key={h}
              data-handle={h}
              className="resize-handle"
              style={{ left: pos.x, top: pos.y, cursor: cursorFor[h] }}
              onPointerDown={(e) => startResize(e, boxObjects[0].id, h)}
            />
          );
        })}

      {/* Endpoint handles for a single selected connector */}
      {connectors.length === 1 &&
        (() => {
          const { a, b } = resolveArrow(connectors[0], byId);
          const pa = worldToScreen(a, camera);
          const pb = worldToScreen(b, camera);
          return (
            <>
              <div className="sel-line" style={lineStyle(pa, pb)} />
              <div
                data-handle="start"
                className="endpoint-handle"
                style={{ left: pa.x, top: pa.y }}
                onPointerDown={(e) => startEndpointDrag(e, connectors[0].id, "start")}
              />
              <div
                data-handle="end"
                className="endpoint-handle"
                style={{ left: pb.x, top: pb.y }}
                onPointerDown={(e) => startEndpointDrag(e, connectors[0].id, "end")}
              />
            </>
          );
        })()}

      {/* Marquee selection rectangle */}
      {marquee && (
        <div
          className="marquee"
          style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
        />
      )}
    </div>
  );
}

const frame = (b) => ({ left: b.left, top: b.top, width: b.width, height: b.height });

function handlePos(b, h) {
  const x =
    h.includes("w") ? b.left : h.includes("e") ? b.left + b.width : b.left + b.width / 2;
  const y =
    h.includes("n") ? b.top : h.includes("s") ? b.top + b.height : b.top + b.height / 2;
  return { x, y };
}

function lineStyle(a, b) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return {
    left: a.x,
    top: a.y,
    width: len,
    transform: `rotate(${angle}deg)`,
    transformOrigin: "0 50%",
  };
}
