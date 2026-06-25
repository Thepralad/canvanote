import { useEffect, useRef } from "react";

const escapeHtml = (s = "") =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

/** HTML content for a text object, migrating legacy plain-text notes. */
const htmlOf = (obj) => obj.html ?? (obj.text ? escapeHtml(obj.text) : "");

/** Put the caret at the very end of an editable element (not select-all,
 *  so double-click + type appends instead of nuking the whole note). */
const caretToEnd = (el) => {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
};

/**
 * Editable rich-text box. Content is stored as HTML so inline formatting
 * (bold / color / font) survives. The contentEditable is *uncontrolled*: React
 * never rewrites its DOM while you're typing, which is exactly what keeps the
 * caret from jumping to the front on every keystroke.
 *
 * We push HTML into the DOM imperatively ONLY when the box is not being edited
 * (initial mount, undo/redo, note load). While editing, the browser owns the
 * DOM and we just read it back out on input. `lastSynced` avoids redundant
 * writes (which would also move the caret).
 *
 * Single click selects (handled by the canvas), double click edits.
 */
export default function TextObject({ obj, editing, onChangeText, onMeasure, onStartEdit }) {
  const ref = useRef(null);
  const lastSynced = useRef(null);

  // DOM <- store, but never while editing (that path is what corrupts the caret).
  useEffect(() => {
    if (!ref.current || editing) return;
    const html = htmlOf(obj);
    if (lastSynced.current !== html && ref.current.innerHTML !== html) {
      ref.current.innerHTML = html;
    }
    lastSynced.current = html;
  }, [obj.html, obj.text, editing]);

  // Entering edit mode: focus and drop the caret at the end.
  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      caretToEnd(ref.current);
    }
  }, [editing]);

  const measure = () => {
    if (ref.current) onMeasure(ref.current.offsetHeight);
  };

  const html = htmlOf(obj);
  const isEmpty = !html || html === "<br>" || html.trim() === "";

  return (
    <div
      data-object-id={obj.id}
      className="obj-text"
      style={{
        left: obj.x,
        top: obj.y,
        width: obj.w,
        minHeight: obj.h,
        fontSize: obj.fontSize,
        fontFamily: obj.fontFamily || undefined,
        color: obj.color,
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEdit(obj.id);
      }}
    >
      <div
        ref={ref}
        className="obj-text-editable"
        contentEditable={editing}
        suppressContentEditableWarning
        spellCheck={false}
        onInput={() => {
          // Remember what we read so the sync effect won't echo it back.
          lastSynced.current = ref.current.innerHTML;
          onChangeText(obj.id, ref.current.innerHTML);
          measure();
        }}
        onBlur={measure}
        style={{ pointerEvents: editing ? "auto" : "none" }}
      />
      {isEmpty && !editing && <span className="obj-text-placeholder">Text</span>}
    </div>
  );
}
