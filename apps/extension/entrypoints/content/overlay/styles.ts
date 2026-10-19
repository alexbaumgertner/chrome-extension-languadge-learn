import { DESIGN_CSS } from "@/lib/design/shadow-css";

/**
 * The in-page panel (design handoff, screen 1). Scoped by the shadow root the panel mounts
 * into — never leaks to/from the host page (Constitution II). The `sw-*` class names are the
 * panel's public hooks for tests and store screenshots; the design-system classes sit beside them.
 */
export const PANEL_CSS = `${DESIGN_CSS}
:host, * { box-sizing: border-box; }
.sw-tab, .sw-panel {
  font-family: var(--font-body); color: var(--color-text); font-size: 15px; line-height: 1.55;
  z-index: 2147483647;
}

/* — collapsed: a vertical tab at the right edge — */
.sw-tab {
  position: fixed; top: 50%; right: 0; transform: translateY(-50%);
  width: 46px; padding: 18px 0 14px;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  background: var(--color-accent); color: var(--color-bg);
  border: none; border-radius: var(--radius-md) 0 0 var(--radius-md);
  box-shadow: var(--shadow-md); cursor: pointer;
}
.sw-tab:hover { background: var(--color-accent-600); }
.sw-tab:active { background: var(--color-accent-700); }
.sw-tab-word {
  writing-mode: vertical-rl; text-transform: uppercase; letter-spacing: .12em;
  font-family: var(--font-heading); font-weight: var(--font-heading-weight); font-size: 14px;
  line-height: 1;
}
.sw-tab-badge {
  background: var(--color-bg); color: var(--color-accent-800); border-radius: 999px;
  padding: 3px 7px; font-size: 12px; font-weight: 700; line-height: 1.2;
}

/* — expanded panel — */
.sw-panel {
  position: fixed; top: 0; right: 0; height: 100vh; width: 412px; max-width: 90vw;
  background: var(--color-bg); box-shadow: var(--shadow-lg);
  display: flex; flex-direction: column; overflow: hidden;
}
.sw-header {
  display: flex; flex-direction: column; gap: 12px;
  padding: 18px 20px 14px; background: var(--color-surface);
}
.sw-header-row { display: flex; align-items: center; gap: 10px; }
.sw-header .brand-mark { width: 26px; height: 26px; font-size: 14px; }
.sw-title {
  font-family: var(--font-heading); font-weight: var(--font-heading-weight);
  font-size: 16px; line-height: 1.2; margin-right: auto;
}
.sw-header .btn-ghost { font-size: 13px; gap: 2px; }
.sw-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.sw-progress { display: flex; align-items: center; gap: 10px; }
.sw-progress-track {
  flex: 1; height: 8px; border-radius: 999px; background: var(--color-neutral-300); overflow: hidden;
}
.sw-progress-fill {
  height: 100%; border-radius: 999px; background: var(--color-accent-2-500);
  transition: width .2s;
}
.sw-progress-label { font-size: 12px; opacity: .7; white-space: nowrap; }

.sw-list {
  flex: 1; overflow-y: auto; padding: 18px 20px 26px;
  display: flex; flex-direction: column; gap: 16px;
}
.sw-empty { margin: 0; font-size: 14px; opacity: .7; }

/* — exercise cards — */
.sw-card { background: var(--color-neutral-100); font-size: 15px; }
.sw-card p { margin: 0; }
.sw-sentence { line-height: 1.6; }
.sw-instruction { font-size: 13px; opacity: .7; }
.sw-blank {
  display: inline-block; background: var(--color-accent-200); border-radius: 6px;
  padding: 0 8px; line-height: 1.4; font-weight: 700; letter-spacing: .05em;
}
.sw-answer-row { display: flex; gap: 8px; }
.sw-answer-row .input { flex: 1; min-width: 0; }
.sw-input-ok { border-color: var(--color-accent-2-500) !important; }
.sw-input-bad { border-color: var(--color-accent-500) !important; }
.sw-feedback { margin: 0; font-size: 13px; color: var(--color-accent-700); }
.sw-feedback-ok { margin: 0; font-size: 13px; color: var(--color-accent-2-700); }

/* Multiple-choice options and pairing cells: buttons that keep their colours once answered. */
.sw-options { display: flex; flex-direction: column; gap: 8px; }
.sw-choice { justify-content: flex-start; text-align: left; font-family: var(--font-body); font-size: 14px; }
.sw-choice:disabled { opacity: 1; cursor: default; }
.sw-options .sw-opt:disabled { opacity: .55; }
.sw-opt-correct, .sw-opt-correct:hover { background: var(--color-accent-2-200) !important; border-color: var(--color-accent-2-300); }
.sw-opt-wrong, .sw-opt-wrong:hover { background: var(--color-accent-200) !important; border-color: var(--color-accent-300); }
.sw-opt-selected, .sw-opt-selected:hover { background: var(--color-accent-300) !important; border-color: var(--color-accent-400); }
.sw-pairing { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.sw-pairing-col { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.sw-pairing .sw-choice { justify-content: center; text-align: center; font-size: 13px; }

.sw-audio-controls { display: flex; align-items: center; gap: 8px; }
.sw-audio-controls .btn-ghost { font-size: 13px; }

/* — report footer — */
.sw-report {
  padding: 12px 20px; border-top: 1px solid var(--color-divider);
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px;
}
.sw-report-btn { font-size: 13px; padding: 6px 14px; }
`;
