import { SHAPE_STYLE } from "../../utils/constants.js";

/** Rectangle / circle. Drawn in the world SVG; pointer-events:all makes the
 *  whole (even transparent) interior selectable. */
export default function ShapeObject({ obj }) {
  const stroke = obj.stroke ?? SHAPE_STYLE.stroke;
  const strokeWidth = obj.strokeWidth ?? SHAPE_STYLE.strokeWidth;
  const fill = obj.fill ?? SHAPE_STYLE.fill;
  const common = {
    "data-object-id": obj.id,
    stroke,
    strokeWidth,
    fill,
    style: { pointerEvents: "all" },
    vectorEffect: "non-scaling-stroke",
  };

  if (obj.type === "circle") {
    return (
      <ellipse
        {...common}
        cx={obj.x + obj.w / 2}
        cy={obj.y + obj.h / 2}
        rx={obj.w / 2}
        ry={obj.h / 2}
      />
    );
  }
  return (
    <rect {...common} x={obj.x} y={obj.y} width={obj.w} height={obj.h} rx={4} ry={4} />
  );
}
