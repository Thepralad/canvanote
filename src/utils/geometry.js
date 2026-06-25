/**
 * Pure geometry helpers. No React, no state — everything here is a function of
 * its inputs so it's trivial to test and reason about.
 *
 * Coordinate spaces:
 *   - world:  the infinite canvas. Objects store their x/y/w/h here.
 *   - screen: pixels in the viewport. Derived via the camera.
 *
 * camera = { x, y, zoom }  where  screen = world * zoom + cameraOffset
 */

export function worldToScreen(pt, camera) {
  return { x: pt.x * camera.zoom + camera.x, y: pt.y * camera.zoom + camera.y };
}

export function screenToWorld(pt, camera) {
  return { x: (pt.x - camera.x) / camera.zoom, y: (pt.y - camera.y) / camera.zoom };
}

/** Bounding box of an object in world space, with center convenience fields. */
export function boxOf(obj) {
  const w = obj.w ?? 0;
  const h = obj.h ?? 0;
  return { x: obj.x, y: obj.y, w, h, cx: obj.x + w / 2, cy: obj.y + h / 2 };
}

export function pointInBox(pt, box, pad = 0) {
  return (
    pt.x >= box.x - pad &&
    pt.x <= box.x + box.w + pad &&
    pt.y >= box.y - pad &&
    pt.y <= box.y + box.h + pad
  );
}

/** Do two world-space boxes overlap? Used by marquee selection. */
export function boxesIntersect(a, b) {
  return !(b.x > a.x + a.w || b.x + b.w < a.x || b.y > a.y + a.h || b.y + b.h < a.y);
}

/** Normalise a drag rectangle (any corner order) into {x,y,w,h}. */
export function rectFromPoints(p1, p2) {
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  return { x, y, w: Math.abs(p2.x - p1.x), h: Math.abs(p2.y - p1.y) };
}

/**
 * Intersection of the segment from the box center toward `target` with the
 * box border. This is what makes connector endpoints sit on an object's edge
 * (pointing at the other end) instead of buried in its center.
 */
export function borderPointToward(box, target) {
  const dx = target.x - box.cx;
  const dy = target.y - box.cy;
  if (dx === 0 && dy === 0) return { x: box.cx, y: box.cy };
  const hw = box.w / 2;
  const hh = box.h / 2;
  const scale = 1 / Math.max(Math.abs(dx) / hw || 0, Math.abs(dy) / hh || 0);
  return { x: box.cx + dx * scale, y: box.cy + dy * scale };
}

/**
 * Resolve an arrow endpoint (free point or bound-to-object) into a concrete
 * world coordinate. `otherEnd` is the resolved coordinate of the opposite end,
 * used to aim the border intersection.
 */
export function resolveEndpoint(end, objectsById, otherEnd) {
  if (end.kind === "bound") {
    const obj = objectsById[end.id];
    if (obj) return borderPointToward(boxOf(obj), otherEnd ?? boxOf(obj));
  }
  return { x: end.x, y: end.y };
}

/** Resolve both ends of an arrow together (two-pass so each aims at the other). */
export function resolveArrow(arrow, objectsById) {
  const roughA = arrow.start.kind === "bound"
    ? centerOf(objectsById[arrow.start.id])
    : { x: arrow.start.x, y: arrow.start.y };
  const roughB = arrow.end.kind === "bound"
    ? centerOf(objectsById[arrow.end.id])
    : { x: arrow.end.x, y: arrow.end.y };
  const a = resolveEndpoint(arrow.start, objectsById, roughB);
  const b = resolveEndpoint(arrow.end, objectsById, roughA);
  return { a, b };
}

function centerOf(obj) {
  if (!obj) return { x: 0, y: 0 };
  const box = boxOf(obj);
  return { x: box.cx, y: box.cy };
}

/** Topmost object whose box contains the point. Skips arrows. Array order is
 *  paint order, so the last match is the one drawn on top. */
export function hitTest(worldPt, objects, pad = 0) {
  let best = null;
  for (const obj of objects) {
    if (obj.type === "arrow") continue;
    if (pointInBox(worldPt, boxOf(obj), pad)) best = obj; // keep last (topmost)
  }
  return best;
}

/** Arrowhead polygon points for an arrow ending at `tip`, coming from `from`. */
export function arrowHead(from, tip, size = 11) {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  const a1 = angle + Math.PI - Math.PI / 7;
  const a2 = angle + Math.PI + Math.PI / 7;
  return [
    tip,
    { x: tip.x + Math.cos(a1) * size, y: tip.y + Math.sin(a1) * size },
    { x: tip.x + Math.cos(a2) * size, y: tip.y + Math.sin(a2) * size },
  ];
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
