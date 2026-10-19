/**
 * Runs the fixed paragraph set through the production translation pipeline (the same Gemini
 * prompt, vocab span matching and response validation /api/translate uses — no cache, no
 * database) and writes a side-by-side Markdown report.
 *
 *   pnpm --filter @sprachweise/cms quality-check                      # GEMINI_MODEL from env/.env
 *   GEMINI_MODEL=gemini-3.6-flash pnpm --filter @sprachweise/cms quality-check --out q-3.6.md
 *
 * Needs only GEMINI_API_KEY. Makes one paid Gemini call per paragraph (20 calls, ~2 cents).
 * Also writes `<out>.json` for scripts/judge.ts.
 */
import { writeFileSync } from "node:fs";
import { TranslateResponseSchema } from "@sprachweise/shared";
import { markVocab } from "../src/pipeline/mark-vocab";
import {
  ProviderConfigError,
  translateParagraph,
  type TranslationResult,
} from "../src/pipeline/translate";
import { QUALITY_PARAGRAPHS } from "./quality-paragraphs";

// config.ts validates every server variable at import; this script needs none but Gemini's.
process.env.DATABASE_URL ??= "postgres://unused-by-quality-check";
const { loadConfig } = await import("../src/config");
const cfg = loadConfig();

/** USD per 1M tokens (input, output incl. thinking), standard paid tier, as of 2026-10. */
const PRICES: Record<string, [number, number]> = {
  "gemini-3.5-flash-lite": [0.3, 2.5],
  "gemini-3.1-flash-lite": [0.25, 1.5],
  "gemini-2.5-flash-lite": [0.1, 0.4],
  "gemini-2.5-flash": [0.3, 2.5],
  "gemini-3.6-flash": [0.75, 3.75],
  "gemini-3.8-flash": [0.75, 3.75],
};

const outIndex = process.argv.indexOf("--out");
const outPath = outIndex !== -1 ? process.argv[outIndex + 1] : "quality-report.md";
if (!outPath) throw new Error("--out needs a file path");

function cell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

interface Row {
  index: number;
  genre: string;
  level: string;
  source: string;
  ms: number;
  result?: TranslationResult;
  marked?: Array<{ german: string; russian: string }>;
  problems: string[];
}

const rows: Row[] = [];
for (const [i, p] of QUALITY_PARAGRAPHS.entries()) {
  const row: Row = {
    index: i + 1,
    genre: p.genre,
    level: p.level,
    source: p.text,
    ms: 0,
    problems: [],
  };
  const started = performance.now();
  try {
    const result = await translateParagraph(p.text, p.level, cfg);
    row.ms = performance.now() - started;
    row.result = result;
    const marked = markVocab(result.text, result.vocab);
    row.marked = marked;
    const dropped = result.vocab.length - marked.length;
    if (dropped > 0)
      row.problems.push(`${dropped} vocab item(s) not found verbatim in the German text`);
    const check = TranslateResponseSchema.safeParse({ text: result.text, markedVocab: marked });
    if (!check.success)
      row.problems.push(`fails response validation: ${check.error.issues[0]?.message}`);
  } catch (err) {
    if (err instanceof ProviderConfigError) {
      console.error(err.message);
      process.exit(1);
    }
    row.ms = performance.now() - started;
    row.problems.push(`error: ${(err as Error).message}`);
  }
  rows.push(row);
  console.log(
    `${row.index}/${QUALITY_PARAGRAPHS.length} ${p.genre} ${p.level} ${Math.round(row.ms)} ms ${row.problems.join("; ")}`,
  );
}

const ok = rows.filter((r) => r.result);
const sum = (f: (r: Row) => number) => ok.reduce((acc, r) => acc + f(r), 0);
const promptTokens = sum((r) => r.result!.usage.promptTokens);
const outputTokens = sum((r) => r.result!.usage.outputTokens + r.result!.usage.thoughtsTokens);
const thoughtsTokens = sum((r) => r.result!.usage.thoughtsTokens);
const latencies = ok.map((r) => r.ms).sort((a, b) => a - b);
const p95 = latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))] ?? 0;
const price = PRICES[cfg.GEMINI_MODEL];
const cost = price ? (promptTokens * price[0] + outputTokens * price[1]) / 1e6 : undefined;

const lines: string[] = [
  `# Translation quality report — ${cfg.GEMINI_MODEL}`,
  "",
  `- Date: ${new Date().toISOString()}`,
  `- Model: \`${cfg.GEMINI_MODEL}\`, thinking level: \`${cfg.GEMINI_THINKING_LEVEL || "(omitted)"}\``,
  `- Paragraphs: ${rows.length}, succeeded: ${ok.length}, with problems: ${rows.filter((r) => r.problems.length).length}`,
  `- Latency: avg ${Math.round(sum((r) => r.ms) / Math.max(ok.length, 1))} ms, p95 ${Math.round(p95)} ms`,
  `- Tokens: ${promptTokens} in, ${outputTokens} out (of which ${thoughtsTokens} thinking)`,
  cost !== undefined
    ? `- Cost: $${cost.toFixed(4)} total, $${(cost / Math.max(ok.length, 1)).toFixed(5)} per paragraph`
    : `- Cost: no price on file for this model (add it to PRICES)`,
  "",
];

for (const r of rows) {
  lines.push(`## ${r.index}. ${r.genre} · ${r.level}`, "");
  if (r.problems.length) lines.push(...r.problems.map((p) => `> ⚠️ ${p}`), "");
  const german = r.result?.text ?? "—";
  const glosses = r.marked?.length
    ? r.marked.map((v) => `**${v.german}** — ${v.russian}`).join("\n")
    : "—";
  lines.push(
    "| Source (RU) | German | Glosses |",
    "| --- | --- | --- |",
    `| ${cell(r.source)} | ${cell(german)} | ${cell(glosses)} |`,
    "",
  );
}

writeFileSync(outPath, lines.join("\n"));
// Machine-readable twin for scripts/judge.ts.
const jsonPath = outPath.replace(/\.md$/, "") + ".json";
writeFileSync(
  jsonPath,
  JSON.stringify(
    {
      model: cfg.GEMINI_MODEL,
      thinkingLevel: cfg.GEMINI_THINKING_LEVEL,
      costPerParagraph: cost !== undefined ? cost / Math.max(ok.length, 1) : null,
      avgLatencyMs: Math.round(sum((r) => r.ms) / Math.max(ok.length, 1)),
      rows: rows.map((r) => ({
        index: r.index,
        genre: r.genre,
        level: r.level,
        source: r.source,
        german: r.result?.text ?? null,
        glosses: r.marked ?? [],
        problems: r.problems,
      })),
    },
    null,
    2,
  ),
);
console.log(`\nWrote ${outPath} and ${jsonPath}`);
