import { worldToScreen } from "../utils/geometry.js";
import { BoldIcon } from "../components/Icons.jsx";

const FONTS = [
  { label: "Sans", value: "" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "ui-monospace, 'SF Mono', Menlo, monospace" },
];

// Restrained palette for color-coding notes.
const COLORS = ["#37352f", "#e03e3e", "#d9730d", "#0f7b6c", "#2383e2", "#6940a5"];

const SIZE_MIN = 10;
const SIZE_MAX = 72;

/**
 * Appears above the text box you're editing. Size + font apply to the whole
 * box; bold + color apply to the highlighted selection (so you can color-code
 * individual words). Buttons preventDefault on mousedown to keep the caret /
 * selection alive inside the contentEditable.
 */
export default function FormatToolbar({ obj, camera, setObject }) {
  if (!obj) return null;

  const tl = worldToScreen({ x: obj.x, y: obj.y }, camera);
  const top = Math.max(8, tl.y - 46);
  const left = Math.max(8, tl.x);

  // Re-emit input so the editable's onInput persists the new HTML to the store.
  const persist = () => {
    const el = document.activeElement;
    if (el && el.classList?.contains("obj-text-editable")) {
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  const exec = (cmd, value = null) => {
    try {
      document.execCommand("styleWithCSS", false, true);
      document.execCommand(cmd, false, value);
    } catch {
      /* execCommand is deprecated but universally supported; ignore failures */
    }
    persist();
  };

  const stepSize = (delta) => {
    const next = Math.max(SIZE_MIN, Math.min(SIZE_MAX, (obj.fontSize || 16) + delta));
    setObject(obj.id, { fontSize: next });
  };

  const setFont = (value) => setObject(obj.id, { fontFamily: value });

  const noBlur = (e) => e.preventDefault();

  return (
    <div className="format-bar" style={{ top, left }} onMouseDown={noBlur}>
      <div className="fmt-group">
        <button className="fmt-btn" title="Smaller" onMouseDown={noBlur} onClick={() => stepSize(-2)}>
          A<span className="fmt-minus">−</span>
        </button>
        <span className="fmt-size">{obj.fontSize || 16}</span>
        <button className="fmt-btn" title="Larger" onMouseDown={noBlur} onClick={() => stepSize(2)}>
          A<span className="fmt-plus">+</span>
        </button>
      </div>

      <span className="fmt-sep" />

      <div className="fmt-group">
        {FONTS.map((f) => (
          <button
            key={f.label}
            className={`fmt-btn fmt-font ${(obj.fontFamily || "") === f.value ? "is-active" : ""}`}
            style={{ fontFamily: f.value || "var(--font)" }}
            title={f.label}
            onMouseDown={noBlur}
            onClick={() => setFont(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <span className="fmt-sep" />

      <button className="fmt-btn" title="Bold  ·  selection" onMouseDown={noBlur} onClick={() => exec("bold")}>
        <BoldIcon width={16} height={16} />
      </button>

      <span className="fmt-sep" />

      <div className="fmt-group fmt-swatches">
        {COLORS.map((c) => (
          <button
            key={c}
            className="fmt-swatch"
            style={{ background: c }}
            title="Color selected text"
            onMouseDown={noBlur}
            onClick={() => exec("foreColor", c)}
          />
        ))}
      </div>
    </div>
  );
}
