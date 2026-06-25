import { resolveArrow, arrowHead } from "../../utils/geometry.js";
import { SHAPE_STYLE } from "../../utils/constants.js";

/**
 * Line / arrow. Endpoints are resolved from current object positions every
 * render, so a connector bound to an object follows it automatically when the
 * object moves. A fat transparent stroke sits under the visible line as a
 * comfortable hit target.
 */
export default function Connector({ obj, objectsById }) {
  const { a, b } = resolveArrow(obj, objectsById);
  const stroke = obj.stroke ?? SHAPE_STYLE.stroke;
  const strokeWidth = obj.strokeWidth ?? SHAPE_STYLE.strokeWidth;

  const head = obj.type === "arrow" ? arrowHead(a, b, 11) : null;

  return (
    <g data-object-id={obj.id}>
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke="transparent"
        strokeWidth={14}
        style={{ pointerEvents: "stroke" }}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={{ pointerEvents: "none" }}
        vectorEffect="non-scaling-stroke"
      />
      {head && (
        <polygon
          points={head.map((p) => `${p.x},${p.y}`).join(" ")}
          fill={stroke}
          style={{ pointerEvents: "none" }}
        />
      )}
    </g>
  );
}
