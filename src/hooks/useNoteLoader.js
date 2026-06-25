import { useEffect, useState } from "react";
import { useStore } from "../store/useStore.js";
import { loadCanvas } from "../db/notesRepo.js";
import { resolveBlobURLs } from "../db/blobsRepo.js";

/** Loads a note's canvas into the store whenever the active note changes. */
export function useNoteLoader(noteId) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    if (!noteId) return undefined;

    (async () => {
      const canvas = await loadCanvas(noteId);
      const blobIds = canvas.objects.map((o) => o.blobId).filter(Boolean);
      const urls = await resolveBlobURLs(blobIds);
      if (cancelled) return;
      useStore.getState().loadNote(noteId, canvas, urls);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [noteId]);

  return ready;
}
