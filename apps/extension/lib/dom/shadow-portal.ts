/**
 * A minimal Shadow-DOM-isolated floating host for small, non-panel UI
 * (vocab-reveal tooltips, inline error banners) — Constitution II requires
 * every piece of extension UI to be style-isolated in both directions.
 * The main right-edge panel uses WXT's createShadowRootUi instead
 * (research.md §1); this covers the lighter-weight cases.
 */
export interface ShadowPortal {
  host: HTMLElement;
  root: ShadowRoot;
  remove(): void;
}

export function createShadowPortal(css: string): ShadowPortal {
  const host = document.createElement("div");
  host.style.position = "absolute";
  host.style.zIndex = "2147483647";
  host.style.top = "0";
  host.style.left = "0";

  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = css;
  root.appendChild(style);

  document.body.appendChild(host);

  return {
    host,
    root,
    remove: () => host.remove(),
  };
}

/** Positions a portal's host just below a target element, in document coordinates. */
export function positionBelow(host: HTMLElement, target: Element): void {
  const rect = target.getBoundingClientRect();
  host.style.top = `${rect.bottom + window.scrollY + 4}px`;
  host.style.left = `${rect.left + window.scrollX}px`;
}
