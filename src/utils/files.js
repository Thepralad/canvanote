/** Read intrinsic dimensions of an image blob via an object URL. */
export function readImageSize(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 280, height: 200 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export function isImageFile(file) {
  return file && file.type && file.type.startsWith("image/");
}

/** Pull image files out of a DataTransfer (drag-drop) or ClipboardData (paste). */
export function imageFilesFrom(dataTransfer) {
  const out = [];
  if (!dataTransfer) return out;
  if (dataTransfer.files && dataTransfer.files.length) {
    for (const f of dataTransfer.files) if (isImageFile(f)) out.push(f);
  }
  if (!out.length && dataTransfer.items) {
    for (const item of dataTransfer.items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) out.push(f);
      }
    }
  }
  return out;
}

/** Fit an image's natural size into a sensible default on-canvas size. */
export function fitSize({ width, height }, max = 360) {
  if (!width || !height) return { w: 280, h: 200 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { w: Math.round(width * scale), h: Math.round(height * scale) };
}
