import caprasimo from "./fonts/caprasimo-latin-400-normal.woff2?inline";
import figtree from "./fonts/figtree-latin-wght-normal.woff2?inline";

/**
 * Chrome ignores `@font-face` inside a shadow root, so the in-page UI registers its two faces on
 * the document's font set instead. The files are bundled into the content script and decoded in
 * memory: nothing is fetched (no host CSP involved, no web-accessible resources, no third-party
 * request). The family names are our own (see tokens.css), so the page's text never changes.
 */
const FACES: Array<{ family: string; data: string; descriptors: FontFaceDescriptors }> = [
  { family: "Sprachweise Caprasimo", data: caprasimo, descriptors: { weight: "400" } },
  { family: "Sprachweise Figtree", data: figtree, descriptors: { weight: "300 900" } },
];

let loaded: FontFace[] | null = null;

function decode(dataUrl: string): ArrayBuffer {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Adds the faces once; failures leave the UI on its system-ui fallback. */
export function loadFonts(): void {
  if (loaded) return;
  loaded = [];
  for (const { family, data, descriptors } of FACES) {
    try {
      const face = new FontFace(family, decode(data), { display: "swap", ...descriptors });
      document.fonts.add(face);
      loaded.push(face);
    } catch {
      // Unsupported or blocked: system-ui it is.
    }
  }
}

/** Takes the faces off the document again (the content script was invalidated). */
export function unloadFonts(): void {
  for (const face of loaded ?? []) document.fonts.delete(face);
  loaded = null;
}
