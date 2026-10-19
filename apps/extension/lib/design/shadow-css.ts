import tokens from "./tokens.css?inline";
import components from "./components.css?inline";

/**
 * The design system as a string, for the in-page UI's shadow roots (panel, notices, glosses).
 * `:host` in tokens.css scopes every variable to our own host element, so nothing reaches the
 * page (Constitution II).
 */
export const DESIGN_CSS = `${tokens}\n${components}`;
