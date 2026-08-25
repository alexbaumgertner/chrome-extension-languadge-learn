/** Scoped by the shadow root the panel mounts into — never leaks to/from the host page (Constitution II). */
export const PANEL_CSS = `
:host, * { box-sizing: border-box; font-family: system-ui, sans-serif; }
.sw-tab {
  position: fixed; top: 50%; right: 0; transform: translateY(-50%);
  background: #1f2933; color: #fff; border: none; border-radius: 8px 0 0 8px;
  padding: 10px 12px; cursor: pointer; font-size: 13px; z-index: 2147483647;
  writing-mode: vertical-rl;
}
.sw-panel {
  position: fixed; top: 0; right: 0; height: 100vh; width: 320px; max-width: 90vw;
  background: #fff; color: #1f2933; box-shadow: -2px 0 12px rgba(0,0,0,0.15);
  z-index: 2147483647; display: flex; flex-direction: column; overflow: hidden;
}
.sw-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; border-bottom: 1px solid #e4e7eb; font-weight: 600;
}
.sw-header button { border: none; background: none; cursor: pointer; font-size: 18px; color: inherit; }
.sw-list { overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.sw-card { border: 1px solid #e4e7eb; border-radius: 8px; padding: 10px; font-size: 14px; }
.sw-card p { margin: 0 0 8px; line-height: 1.4; }
.sw-card input {
  width: 100%; padding: 6px 8px; border: 1px solid #cbd2d9; border-radius: 6px; font-size: 14px;
}
.sw-card button.sw-submit {
  margin-top: 6px; padding: 5px 10px; border: none; border-radius: 6px;
  background: #1f2933; color: #fff; cursor: pointer; font-size: 13px;
}
.sw-card button.sw-submit:disabled { opacity: 0.5; cursor: default; }
.sw-feedback { color: #b71c1c; margin-top: 6px; font-size: 13px; }
.sw-feedback-ok { color: #1b5e20; margin-top: 6px; font-size: 13px; }
.sw-options { display: flex; flex-direction: column; gap: 6px; }
.sw-opt, .sw-opt-correct, .sw-opt-wrong, .sw-opt-selected {
  text-align: left; padding: 6px 8px; border-radius: 6px; border: 1px solid #cbd2d9;
  background: #fff; cursor: pointer; font-size: 13px;
}
.sw-opt-correct { border-color: #1b5e20; background: #e8f5e9; }
.sw-opt-wrong { border-color: #b71c1c; background: #ffebee; }
.sw-opt-selected { border-color: #1f2933; background: #f0f2f4; }
.sw-pairing { display: flex; gap: 12px; }
.sw-pairing-col { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.sw-audio-controls { display: flex; gap: 8px; margin-bottom: 8px; }
.sw-audio-controls button {
  border: 1px solid #cbd2d9; background: #fff; border-radius: 6px; padding: 5px 10px; cursor: pointer;
}
`;
