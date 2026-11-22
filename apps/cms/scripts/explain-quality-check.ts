/**
 * Runs the fixed fragments through the production explain pipeline (same prompt, span location and
 * validation /api/explain uses, no cache, no database) and writes a Markdown report: whether each
 * answer was valid, the translation, and the phenomena named against those a good answer would name.
 *
 *   pnpm --filter @sprachweise/cms explain-quality-check                 # GEMINI_MODEL from env/.env
 *   pnpm --filter @sprachweise/cms explain-quality-check --out q-explain.md
 *
 * Needs only GEMINI_API_KEY. One paid Gemini call per fragment (20 calls). A person reads the
 * report; there is no judge model yet.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { costUsd } from "../src/pipeline/pricing";
import { explainFragment } from "../src/pipeline/explain";
import { EXPLAIN_FIXTURES } from "./explain-fixtures";

// config.ts validates every server variable at import; this script needs none but Gemini's.
process.env.DATABASE_URL ??= "postgres://unused-by-explain-quality-check";
const { loadConfig } = await import("../src/config");
const cfg = loadConfig();

const outIndex = process.argv.indexOf("--out");
const outPath = outIndex !== -1 ? process.argv[outIndex + 1] : "explain-quality-report.md";
if (!outPath) throw new Error("--out needs a file path");

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, "<br>");

let valid = 0;
let cost = 0;
const lines: string[] = [];
for (const [i, fixture] of EXPLAIN_FIXTURES.entries()) {
  const started = performance.now();
  try {
    const { explanation, usage } = await explainFragment(fixture.text, fixture.level, cfg);
    const ms = Math.round(performance.now() - started);
    cost += costUsd(cfg.GEMINI_MODEL, usage) ?? 0;
    valid += 1;
    const named: string[] = explanation.grammar.map((g) => g.id);
    const hit =
      fixture.expect.length === 0
        ? "n/a"
        : fixture.expect.some((e) => named.includes(e))
          ? "yes"
          : "NO";
    lines.push(
      `| ${i + 1} | ${fixture.level} | ${cell(fixture.text)} | ${cell(explanation.translationRu)} | ` +
        `${explanation.tokens.length} | ${cell(named.join(", "))} | ${hit} | ${ms} |`,
    );
  } catch (err) {
    lines.push(
      `| ${i + 1} | ${fixture.level} | ${cell(fixture.text)} | INVALID: ${(err as Error).name} | | | | |`,
    );
  }
}

const report =
  `# Explain quality: ${cfg.GEMINI_MODEL}, thinking ${cfg.GEMINI_THINKING_LEVEL || "(omitted)"}\n\n` +
  `Valid answers: ${valid}/${EXPLAIN_FIXTURES.length}. Estimated cost: $${cost.toFixed(4)}.\n\n` +
  "| # | Level | Fragment | Russian | Tokens | Grammar named | Expected one named | ms |\n" +
  "| --- | --- | --- | --- | --- | --- | --- | --- |\n" +
  lines.join("\n") +
  "\n";
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, report);
console.log(`${valid}/${EXPLAIN_FIXTURES.length} valid, written to ${outPath}`);
