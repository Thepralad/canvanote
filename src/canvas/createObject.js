import { DEFAULTS, SHAPE_STYLE } from "../utils/constants.js";

export function createText(point) {
  return {
    type: "text",
    x: point.x,
    y: point.y,
    w: DEFAULTS.text.w,
    h: DEFAULTS.text.h,
    fontSize: DEFAULTS.text.fontSize,
    fontFamily: "",
    color: DEFAULTS.text.color,
    html: "",
  };
}

/** Box shape (rectangle/circle) from two drag points. */
export function createBoxShape(type, p1, p2) {
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const w = Math.max(Math.abs(p2.x - p1.x), DEFAULTS[type].w * 0.25);
  const h = Math.max(Math.abs(p2.y - p1.y), DEFAULTS[type].h * 0.25);
  return { type, x, y, w, h, ...SHAPE_STYLE };
}

/** Connector (line/arrow) from two endpoints, with optional bindings. */
export function createConnector(type, start, end) {
  return { type, start, end, ...SHAPE_STYLE };
}

export function pointEnd(p) {
  return { kind: "point", x: p.x, y: p.y };
}

export function boundEnd(id) {
  return { kind: "bound", id };
}
