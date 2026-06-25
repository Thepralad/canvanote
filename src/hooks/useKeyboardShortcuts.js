import { useEffect } from "react";
import { useStore } from "../store/useStore.js";
import { useImageInsert } from "./useImageInsert.js";
import { imageFilesFrom } from "../utils/files.js";
import { screenToWorld } from "../utils/geometry.js";

const isEditable = (el) =>
  el &&
  (el.isContentEditable ||
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.closest?.('[contenteditable="true"]'));

/** Centre of the current viewport, in world coordinates. */
function viewportCenterWorld() {
  const { camera } = useStore.getState();
  return screenToWorld(
    { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    camera
  );
}

export function useKeyboardShortcuts() {
  const insertImages = useImageInsert();

  useEffect(() => {
    const s = () => useStore.getState();

    const onKeyDown = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      const target = e.target;

      // While editing text, let the textbox own the keyboard.
      if (isEditable(target)) {
        if (e.key === "Escape") target.blur();
        return;
      }

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? s().redo() : s().undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        s().redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        s().copySelection();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        s().duplicateSelection();
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        s().selectAll();
        return;
      }
      if (mod && e.key === "]") {
        e.preventDefault();
        s().bringForward();
        return;
      }
      if (mod && e.key === "[") {
        e.preventDefault();
        s().sendBackward();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        s().deleteSelected();
        return;
      }
      if (e.key === "Escape") {
        s().clearSelection();
        s().setTool("select");
      }
    };

    // System-clipboard paste: image -> insert, otherwise internal objects.
    const onPaste = (e) => {
      if (isEditable(e.target)) return;
      const imgs = imageFilesFrom(e.clipboardData);
      if (imgs.length) {
        e.preventDefault();
        insertImages(imgs, viewportCenterWorld());
      } else if (s().clipboard.length) {
        e.preventDefault();
        s().paste();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("paste", onPaste);
    };
  }, [insertImages]);
}
