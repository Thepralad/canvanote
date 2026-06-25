import { useEffect, useState } from "react";
import { useStore } from "../store/useStore.js";
import { renameNote } from "../db/notesRepo.js";
import {
  UndoIcon, RedoIcon, LayersUpIcon, LayersDownIcon,
} from "./Icons.jsx";

export default function Topbar({ note }) {
  const camera = useStore((s) => s.camera);
  const selection = useStore((s) => s.selection);
  const setZoom = useStore((s) => s.setZoom);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const bringForward = useStore((s) => s.bringForward);
  const sendBackward = useStore((s) => s.sendBackward);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);

  const [title, setTitle] = useState(note?.title ?? "");
  useEffect(() => setTitle(note?.title ?? ""), [note?.id, note?.title]);

  const commitTitle = () => {
    const next = title.trim() || "Untitled";
    if (note && next !== note.title) renameNote(note.id, next);
    setTitle(next);
  };

  const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const zoomPct = Math.round(camera.zoom * 100);

  return (
    <div className="topbar">
      <input
        className="title-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        placeholder="Untitled"
        aria-label="Note title"
      />

      <div className="topbar-actions">
        {selection.length > 0 && (
          <div className="btn-cluster">
            <button className="icon-btn" title="Send backward  ·  Ctrl+[" onClick={sendBackward}>
              <LayersDownIcon />
            </button>
            <button className="icon-btn" title="Bring forward  ·  Ctrl+]" onClick={bringForward}>
              <LayersUpIcon />
            </button>
          </div>
        )}

        <div className="btn-cluster">
          <button className="icon-btn" title="Undo  ·  Ctrl+Z" onClick={undo} disabled={!canUndo}>
            <UndoIcon />
          </button>
          <button className="icon-btn" title="Redo  ·  Ctrl+Shift+Z" onClick={redo} disabled={!canRedo}>
            <RedoIcon />
          </button>
        </div>

        <div className="zoom-cluster">
          <button className="zoom-btn" title="Zoom out" onClick={() => setZoom(camera.zoom / 1.2, center)}>
            −
          </button>
          <button className="zoom-label" title="Reset zoom" onClick={() => setZoom(1, center)}>
            {zoomPct}%
          </button>
          <button className="zoom-btn" title="Zoom in" onClick={() => setZoom(camera.zoom * 1.2, center)}>
            +
          </button>
        </div>
      </div>
    </div>
  );
}
