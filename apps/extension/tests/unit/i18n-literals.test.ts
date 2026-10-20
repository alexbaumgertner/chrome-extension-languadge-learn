import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Every string the learner reads goes through lib/i18n.ts (chrome.i18n), so a screen is never
 * half English, half Russian. This scans the .tsx sources for user-visible text written as a
 * literal instead.
 */
const SOURCES = import.meta.glob<string>(["../../entrypoints/**/*.tsx", "../../lib/**/*.tsx"], {
  query: "?raw",
  import: "default",
  eager: true,
});

/** Literals that are fine anywhere: the brand, and German example words (data, never translated). */
const ALLOWED = new Set<string>(["Sprachweise", "S"]);
const GERMAN_EXAMPLES = new Set<string>([]);

/** JSX attributes whose value is read or announced to the learner. */
const VISIBLE_ATTRIBUTES = new Set([
  "aria-label",
  "aria-description",
  "aria-placeholder",
  "aria-roledescription",
  "aria-valuetext",
  "title",
  "placeholder",
  "alt",
  "label",
]);

/** Calls whose string arguments aren't UI copy: i18n keys, developer messages. */
const IGNORED_CALLEES = /^(t|tPlural|tNode|chrome\.i18n\.getMessage|console\.\w+)$/;

const LETTER = /[A-Za-zА-Яа-яЁё]/;

/** Looks like a sentence or a label rather than an identifier, class list or path. */
function isProse(text: string): boolean {
  if (/^\s*</.test(text)) return false; // markup
  if (/^[A-Z0-9_]+$/.test(text)) return false; // CONSTANT_CASE message types
  return /[А-Яа-яЁё]/.test(text) || /[A-Za-z]\s+[A-Za-z]/.test(text) || /^[A-Z][a-z]/.test(text);
}

function literalText(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    // Substitutions read as a word, so `${n} exercises` and `${a} of ${b}` still look like prose.
    return node.head.text + node.templateSpans.map((s) => `x${s.literal.text}`).join("");
  }
  return null;
}

function calleeName(call: ts.CallExpression | ts.NewExpression): string {
  return call.expression.getText();
}

/** Whether the literal is the value of an expression rendered as a JSX child or visible attribute. */
function renderedPosition(node: ts.Node): "child" | "visible-attribute" | "attribute" | null {
  let current: ts.Node = node;
  for (;;) {
    const parent = current.parent;
    if (
      ts.isParenthesizedExpression(parent) ||
      (ts.isConditionalExpression(parent) && parent.condition !== current) ||
      (ts.isBinaryExpression(parent) &&
        parent.right === current &&
        [
          ts.SyntaxKind.AmpersandAmpersandToken,
          ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.QuestionQuestionToken,
        ].includes(parent.operatorToken.kind))
    ) {
      current = parent;
      continue;
    }
    if (ts.isJsxExpression(parent)) {
      const owner = parent.parent;
      if (ts.isJsxAttribute(owner)) {
        return VISIBLE_ATTRIBUTES.has(owner.name.getText()) ? "visible-attribute" : "attribute";
      }
      return "child";
    }
    if (ts.isJsxAttribute(parent)) {
      return VISIBLE_ATTRIBUTES.has(parent.name.getText()) ? "visible-attribute" : "attribute";
    }
    return null;
  }
}

/** Contexts where a string literal is code, not copy. */
function isIgnoredContext(node: ts.Node): boolean {
  for (let current: ts.Node = node; current.parent; current = current.parent) {
    const parent = current.parent;
    if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return true;
    if (ts.isTypeNode(parent) || ts.isLiteralTypeNode(parent)) return true;
    if (
      (ts.isCallExpression(parent) || ts.isNewExpression(parent)) &&
      current !== parent.expression
    ) {
      const name = calleeName(parent);
      if (IGNORED_CALLEES.test(name) || /Error$/.test(name)) return true;
      return false;
    }
    if (ts.isPropertyAssignment(parent) && parent.name === current) return true;
    if (ts.isCaseClause(parent) && parent.expression === current) return true;
    if (
      ts.isBinaryExpression(parent) &&
      [
        ts.SyntaxKind.EqualsEqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
        ts.SyntaxKind.EqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsToken,
      ].includes(parent.operatorToken.kind)
    ) {
      return true;
    }
    if (
      ts.isBinaryExpression(parent) &&
      parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      parent.right === current &&
      /\.className$/.test(parent.left.getText())
    ) {
      return true;
    }
    if (ts.isStatement(parent)) return false;
  }
  return false;
}

export interface Finding {
  line: number;
  text: string;
}

export function findHardcodedText(source: string, fileName = "file.tsx"): Finding[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings: Finding[] = [];
  const report = (node: ts.Node, text: string): void => {
    const trimmed = text.trim();
    if (ALLOWED.has(trimmed) || GERMAN_EXAMPLES.has(trimmed)) return;
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
    findings.push({ line: line + 1, text: trimmed });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node)) {
      if (LETTER.test(node.text)) report(node, node.text);
      return;
    }
    const text = literalText(node);
    if (text !== null && LETTER.test(text)) {
      const position = renderedPosition(node);
      if (position === "child" || position === "visible-attribute") {
        report(node, text);
      } else if (position === null && isProse(text) && !isIgnoredContext(node)) {
        report(node, text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return findings;
}

describe("findHardcodedText", () => {
  const texts = (src: string) => findHardcodedText(src).map((f) => f.text);

  it("flags visible copy", () => {
    expect(texts(`const a = <button>Check</button>;`)).toEqual(["Check"]);
    expect(texts(`const a = <input placeholder="Type the missing word" />;`)).toEqual([
      "Type the missing word",
    ]);
    expect(texts(`const a = <button aria-label={"Collapse"} />;`)).toEqual(["Collapse"]);
    expect(texts(`const a = <p>{failed ? "retry" : "send"}</p>;`)).toEqual(["retry", "send"]);
    expect(texts(`const a = <p>{ok && "slow"}</p>;`)).toEqual(["slow"]);
    expect(texts("const label = `${n} exercise${n === 1 ? '' : 's'}`;")).toEqual(["x exercisex"]);
    expect(texts(`const KICKERS = { a: "Match the pairs" };`)).toEqual(["Match the pairs"]);
    expect(texts(`const hint = "Плохой перевод";`)).toEqual(["Плохой перевод"]);
    expect(texts(`el.setAttribute("aria-label", "Dismiss");`)).toEqual(["Dismiss"]);
  });

  it("leaves code, keys, markup and the brand alone", () => {
    const src = `
      import { t } from "@/lib/i18n";
      type Kind = "fill-blank" | "Word Pair";
      const a = <div className="sw-card card elev-sm" role="status" lang={lang}>{t("panelEmpty")}</div>;
      const b = <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12" />;
      const c = <span className="brand-mark">S</span>;
      const d = <span className="sw-title">Sprachweise</span>;
      const msg = { type: "GET_LEARNER_SETTINGS", action: "translate-selection" };
      const e = <b className={\`\${className} sw-choice btn btn-secondary\`} />;
      const inputState = ok ? " sw-input-ok" : " sw-input-bad";
      wrap.className = \`msg \${tone}\`;
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg>';
      if (state === "Some State") {}
      switch (kind) { case "Fill Blank": break; }
      console.error("Sprachweise: page action failed", err);
      throw new Error("Something broke here");
      const label = t("popupShortcut", "Alt+Shift+G");
    `;
    expect(findHardcodedText(src)).toEqual([]);
  });
});

describe("UI sources", () => {
  const files = Object.entries(SOURCES).map(([file, source]) => [file.slice(6), source]);

  it("finds the .tsx files", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files)("%s renders no hardcoded text", (file, source) => {
    const findings = findHardcodedText(source, file).map(
      (f) => `${file}:${f.line} ${JSON.stringify(f.text)}`,
    );
    expect(findings, "move these strings to public/_locales/{en,ru}/messages.json").toEqual([]);
  });
});
