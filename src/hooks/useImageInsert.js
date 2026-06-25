import { useCallback } from "react";
import { useStore } from "../store/useStore.js";
import { putBlob } from "../db/blobsRepo.js";
import { readImageSize, fitSize } from "../utils/files.js";

/**
 * Returns a function to drop one or more image/gif files onto the canvas at a
 * given world point. Handles GIFs transparently — we keep the original blob, so
 * the <img> animates exactly as the source file does.
 */
export function useImageInsert() {
  const addObjects = useStore((s) => s.addObjects);
  const registerBlobURL = useStore((s) => s.registerBlobURL);

  return useCallback(
    async (files, worldPoint) => {
      const created = [];
      let cursor = { ...worldPoint };

      for (const file of files) {
        const blobId = await putBlob(file);
        const { w, h } = fitSize(await readImageSize(file));
        const url = URL.createObjectURL(file);
        registerBlobURL(blobId, url);
        created.push({
          type: "image",
          x: cursor.x - w / 2,
          y: cursor.y - h / 2,
          w,
          h,
          blobId,
        });
        cursor = { x: cursor.x + 24, y: cursor.y + 24 }; // cascade multiples
      }

      if (created.length) addObjects(created);
    },
    [addObjects, registerBlobURL]
  );
}
