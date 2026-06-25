import { GRID_SIZE } from "../utils/constants.js";

/** Subtle dot grid drawn in screen space; spacing/offset derive from the camera
 *  so it reads as an infinite plane under the world. */
export default function Grid({ camera, show }) {
  if (!show) return null;
  const size = GRID_SIZE * camera.zoom;
  const offX = ((camera.x % size) + size) % size;
  const offY = ((camera.y % size) + size) % size;
  return (
    <div
      className="grid-bg"
      style={{
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: `${offX}px ${offY}px`,
        // fade the grid out when zoomed far away to avoid moiré
        opacity: camera.zoom < 0.4 ? 0 : 1,
      }}
    />
  );
}
