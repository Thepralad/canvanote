import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore.js";
import { saveCanvas } from "../db/notesRepo.js";

/**
 * Watches the live store and writes the canvas back to IndexedDB whenever
 * objects or camera change, debounced so a drag doesn't hammer the disk.
 * Flushes immediately on unmount / note switch so nothing is lost.
 */
export function usePersistence(noteId, delay = 400) {
  const timer = useRef(null);
  const latest = useRef(null);
  const lastObjects = useRef(null); // reference to detect content vs camera-only

  useEffect(() => {
    if (!noteId) return undefined;
    lastObjects.current = useStore.getState().objects;

    const flush = () => {
      if (!latest.current) return;
      const { objects, camera, touch } = latest.current;
      saveCanvas(noteId, { objects, camera }, touch).catch(() => {});
      latest.current = null;
    };

    const unsub = useStore.subscribe((state) => {
      if (state.noteId !== noteId) return;
      // objects array identity changes only on real edits; camera pans/zooms
      // keep the same reference, so we can avoid bumping "edited" on pan.
      const contentChanged = state.objects !== lastObjects.current;
      lastObjects.current = state.objects;
      latest.current = {
        objects: state.objects,
        camera: state.camera,
        touch: contentChanged || latest.current?.touch || false,
      };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    });

    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
      flush(); // persist the final state on the way out
    };
  }, [noteId, delay]);
}
