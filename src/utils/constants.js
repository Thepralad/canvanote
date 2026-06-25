export const ZOOM_MIN = 0.15;
export const ZOOM_MAX = 5;
export const ZOOM_STEP = 1.0015; // multiplier per wheel delta unit

export const GRID_SIZE = 32; // world px between grid dots
export const SNAP_DISTANCE = 18; // screen px radius for connector snapping

export const DEFAULTS = {
  text: { w: 220, h: 48, fontSize: 16, color: "#37352f" },
  image: { w: 280, h: 200 },
  rectangle: { w: 160, h: 110 },
  circle: { w: 140, h: 140 },
  line: { w: 160, h: 0 },
  arrow: {},
};

export const SHAPE_STYLE = {
  stroke: "#37352f",
  strokeWidth: 2,
  fill: "transparent",
};

export const MIN_SIZE = 12; // smallest object dimension when resizing
