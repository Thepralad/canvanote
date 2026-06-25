import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/database.js";
import { createNote, deleteNote, renameNote } from "../db/notesRepo.js";
import { relativeTime } from "../utils/time.js";
import { PlusIcon, SearchIcon, TrashIcon, ChevronLeftIcon } from "./Icons.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";

const MIN_W = 200;
const MAX_W = 460;

export default function Sidebar({ activeId, onSelect, width, collapsed, onResize, onClose }) {
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [resizing, setResizing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  // Tick so relative "edited 2m ago" labels stay current without an edit.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Stable creation order (newest first); never reshuffles on edit.
  const notes = useLiveQuery(() => db.notes.toArray(), []);
  const ordered = useMemo(
    () => [...(notes ?? [])].sort((a, b) => b.createdAt - a.createdAt),
    [notes]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((n) => n.title.toLowerCase().includes(q));
  }, [ordered, query]);

  const handleNew = async () => {
    const note = await createNote();
    onSelect(note.id);
  };

const requestDelete = (e, note) => {
  e.stopPropagation();
  setPendingDelete(note);
};

  const confirmDelete = async () => {
    const id = pendingDelete.id;
    await deleteNote(id);
    if (id === activeId) {
      const remaining = ordered.filter((n) => n.id !== id);
      onSelect(remaining[0]?.id ?? null);
    }
    setPendingDelete(null);
  };
  const startRename = (e, note) => {
    e.stopPropagation();
    setRenamingId(note.id);
    setDraftTitle(note.title);
  };

  const commitRename = async (id) => {
    const next = draftTitle.trim() || "Untitled";
    await renameNote(id, next);
    setRenamingId(null);
  };

  // Drag the right edge to resize. Sidebar's left edge sits at x=0, so the new
  // width is just the clamped pointer x.
  const beginResize = (e) => {
    e.preventDefault();
    setResizing(true);
    const move = (ev) => onResize(Math.max(MIN_W, Math.min(MAX_W, ev.clientX)));
    const up = () => {
      setResizing(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <aside
      className={`sidebar ${collapsed ? "is-collapsed" : ""} ${resizing ? "is-resizing" : ""}`}
      style={{ width: collapsed ? 0 : width }}
    >
      <div className="sidebar-inner" style={{ width }}>
        <div className="sidebar-head">
          <span className="brand">Moonote</span>
          <div className="sidebar-head-actions">
            <button className="new-btn" onClick={handleNew} title="New note">
              <PlusIcon width={16} height={16} />
            </button>
            <button className="new-btn" onClick={onClose} title="Hide sidebar">
              <ChevronLeftIcon width={16} height={16} />
            </button>
          </div>
        </div>

        <div className="search">
          <SearchIcon width={15} height={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes"
            aria-label="Search notes"
          />
        </div>

        <div className="note-list">
          {filtered.length === 0 && (
            <p className="empty-hint">
              {query ? "No matches." : "No notes yet — create one to start."}
            </p>
          )}
          {filtered.map((note) => (
            <div
              key={note.id}
              className={`note-item ${note.id === activeId ? "is-active" : ""}`}
              onClick={() => onSelect(note.id)}
            >
              <div className="note-main">
                {renamingId === note.id ? (
                  <input
                    className="rename-input"
                    autoFocus
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => commitRename(note.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(note.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                  />
                ) : (
                  <span
                    className="note-title"
                    onDoubleClick={(e) => startRename(e, note)}
                  >
                    {note.title}
                  </span>
                )}
                <span className="note-time">edited {relativeTime(note.updatedAt)}</span>
              </div>
              <button
                className="note-delete"
                title="Delete note"
                onClick={(e) => requestDelete(e, note)}
              >
                <TrashIcon width={15} height={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {!collapsed && (
        <div
          className="sidebar-resize"
          onPointerDown={beginResize}
          title="Drag to resize"
          role="separator"
          aria-orientation="vertical"
        />
      )}
        <ConfirmDialog
          open={!!pendingDelete}
          title="Delete this note?"
          message={pendingDelete ? `“${pendingDelete.title}” will be permanently removed.` : ""}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
    </aside>
  );
}
