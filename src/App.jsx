import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db/database.js";
import { createNote } from "./db/notesRepo.js";
import { useNoteLoader } from "./hooks/useNoteLoader.js";
import { usePersistence } from "./hooks/usePersistence.js";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts.js";
import Sidebar from "./components/Sidebar.jsx";
import Canvas from "./canvas/Canvas.jsx";
import { SidebarIcon } from "./components/Icons.jsx";
import WelcomeOverlay from "./components/WelcomeOverlay.jsx";

export default function App() {
  const [activeId, setActiveId] = useState(null);
  const [booted, setBooted] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(264);
  const [collapsed, setCollapsed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(
  () => localStorage.getItem("moonote.welcomed") !== "1"
  );
  const dismissWelcome = () => {
    localStorage.setItem("moonote.welcomed", "1");
    setShowWelcome(false);
  };

  // Live, creation-ordered list drives the sidebar and active-note logic.
  const notes = useLiveQuery(() => db.notes.toArray(), []);
  const ordered = notes
    ? [...notes].sort((a, b) => b.createdAt - a.createdAt)
    : undefined;

  // First load: seed a starter note if empty, else open the newest one.
  useEffect(() => {
    if (booted || ordered === undefined) return;
    (async () => {
      if (ordered.length === 0) {
        const note = await createNote("Welcome");
        setActiveId(note.id);
      } else {
        setActiveId(ordered[0].id);
      }
      setBooted(true);
    })();
  }, [ordered, booted]);

  // If the active note vanishes (deleted elsewhere), fall back to the newest.
  useEffect(() => {
    if (!booted || ordered === undefined) return;
    if (activeId && !ordered.some((n) => n.id === activeId)) {
      setActiveId(ordered[0]?.id ?? null);
    }
  }, [ordered, activeId, booted]);

  const ready = useNoteLoader(activeId);
  usePersistence(activeId);
  useKeyboardShortcuts();

  const activeNote = ordered?.find((n) => n.id === activeId) ?? null;

  return (
    <div className="app">
      <Sidebar
        activeId={activeId}
        onSelect={setActiveId}
        width={sidebarWidth}
        collapsed={collapsed}
        onResize={setSidebarWidth}
        onClose={() => setCollapsed(true)}
      />

      <main className="workspace">
        {collapsed && (
          <button
            className="sidebar-reopen"
            onClick={() => setCollapsed(false)}
            title="Show sidebar"
          >
            <SidebarIcon width={17} height={17} />
          </button>
        )}

        {activeId && ready && activeNote ? (
          <Canvas key={activeId} note={activeNote} sidebarCollapsed={collapsed} />
        ) : (
          <div className="workspace-empty">
            {activeId ? <p>Loading canvas…</p> : <p>Create or select a note to start.</p>}
          </div>
        )}
      </main>
       <WelcomeOverlay open={showWelcome} onGetStarted={dismissWelcome} />
    </div>
  );
}
