import type { TranslationDensity } from "@sprachweise/shared";

const MIN_TEXT_LENGTH = 80;

const EXCLUDED_ANCESTOR_SELECTOR = [
  "nav",
  "header",
  "footer",
  "aside",
  "script",
  "style",
  "code",
  "pre",
  "form",
  "button",
].join(",");

/** Known non-article containers observed in the DOM spike (docs/spike-findings.md). */
const EXCLUDED_CONTAINER_SELECTOR = [
  '[class*="teaser" i]',
  '[class*="paywall" i]',
  '[class*="related" i]',
  '[class*="promo" i]',
  '[data-testid*="teaser" i]',
].join(",");

const CONTENT_ROOT_SELECTOR = "article, main, [role='main']";

const DENSITY_LIMIT: Record<TranslationDensity, number> = {
  low: 3,
  medium: 10,
  max: Infinity,
};

function findContentRoot(doc: Document): ParentNode {
  return doc.querySelector(CONTENT_ROOT_SELECTOR) ?? doc.body;
}

function hasEligibleChild(el: Element): boolean {
  return [...el.children].some((child) => {
    const text = (child as HTMLElement).innerText ?? child.textContent ?? "";
    return text.trim().length > MIN_TEXT_LENGTH;
  });
}

/**
 * Selects deepest-block eligible paragraphs within the page's main-content root,
 * excluding chrome (nav/header/footer/etc.) and known teaser/paywall containers.
 * Per research.md §2 / docs/spike-snippet.js, tightened to fix the tagesschau.de
 * and Medium false positives the spike found.
 */
export function findEligibleParagraphs(doc: Document = document): HTMLElement[] {
  const root = findContentRoot(doc);
  const candidates = [...root.querySelectorAll<HTMLElement>("p, article div, li")];

  return candidates.filter((el) => {
    const text = el.innerText ?? el.textContent ?? "";
    if (text.trim().length <= MIN_TEXT_LENGTH) return false;
    if (el.closest(EXCLUDED_ANCESTOR_SELECTOR)) return false;
    if (el.closest(EXCLUDED_CONTAINER_SELECTOR)) return false;
    if (hasEligibleChild(el)) return false; // only the deepest block
    if (el.getClientRects().length === 0) return false; // not rendered
    return true;
  });
}

/**
 * Applies the learner's translation-density setting as a simultaneous-eligibility cap:
 * `low`/`medium`/`max` bound how many paragraphs on the page may be clickable at once.
 */
export function applyDensityLimit(
  paragraphs: HTMLElement[],
  density: TranslationDensity,
): HTMLElement[] {
  const limit = DENSITY_LIMIT[density];
  return paragraphs.slice(0, limit);
}
