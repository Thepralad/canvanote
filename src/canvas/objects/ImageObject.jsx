/**
 * Image / GIF. We render the original blob via its object URL, so animated GIFs
 * animate exactly as the source — no special handling required.
 */
export default function ImageObject({ obj, url }) {
  return (
    <div
      data-object-id={obj.id}
      className="obj-image"
      style={{ left: obj.x, top: obj.y, width: obj.w, height: obj.h }}
    >
      {url ? (
        <img src={url} alt="" draggable={false} />
      ) : (
        <div className="obj-image-missing">image unavailable</div>
      )}
    </div>
  );
}
