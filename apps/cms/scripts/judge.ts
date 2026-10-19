/**
 * Blind LLM-judge pass over several quality-check runs (one per candidate model).
 *
 *   pnpm --filter @sprachweise/cms judge q-a.json q-b.json q-c.json [--judge gemini-3.1-pro-preview]
 *
 * For each paragraph the judge sees the Russian source, the target level and every candidate's
 * German text + glosses under shuffled letters (A, B, …) — never the model names — and scores each
 * 1–5 on meaning, grammar, level fit and glosses, listing concrete errors. Writes judge-report.md.
 * Caveat: the judge is also a Gemini model, so same-family style bias is possible; spot-check.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

interface RunRow {
  index: number;
  genre: string;
  level: string;
  source: string;
  german: string | null;
  glosses: Array<{ german: string; russian: string }>;
  problems: string[];
}

interface Run {
  model: string;
  costPerParagraph: number | null;
  avgLatencyMs: number;
  rows: RunRow[];
}

interface Evaluation {
  label: string;
  meaning: number;
  grammar: number;
  levelFit: number;
  glosses: number;
  errors: string[];
}

const args = process.argv.slice(2);
const judgeIndex = args.indexOf("--judge");
const judgeModel = judgeIndex !== -1 ? args[judgeIndex + 1] : "gemini-3.1-pro-preview";
const files = args.filter(
  (a, i) => a.endsWith(".json") && (judgeIndex === -1 || i !== judgeIndex + 1),
);
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY is required");
if (files.length < 2) throw new Error("pass at least two quality-check .json files");

const runs: Run[] = files.map((f) => JSON.parse(readFileSync(f, "utf8")) as Run);
const paragraphCount = runs[0]!.rows.length;
const LETTERS = "ABCDEFGH";

/** Deterministic per-paragraph shuffle so a rerun presents the same order. */
function shuffledRunIndexes(seed: number): number[] {
  return runs
    .map((_, i) => i)
    .sort(
      (a, b) =>
        createHash("sha256").update(`${seed}:${a}`).digest()[0]! -
        createHash("sha256").update(`${seed}:${b}`).digest()[0]!,
    );
}

function judgePrompt(row: RunRow, order: number[]): string {
  const candidates = order
    .map((runIdx, pos) => {
      const r = runs[runIdx]!.rows[row.index - 1]!;
      const glosses = r.glosses.map((g) => `${g.german} — ${g.russian}`).join("; ") || "(none)";
      return `### Candidate ${LETTERS[pos]}\nGerman: ${r.german ?? "(FAILED — no output)"}\nGlosses: ${glosses}`;
    })
    .join("\n\n");
  return (
    "You are a strict German teacher who is a native Russian speaker. A reading app translates a " +
    `Russian paragraph into German for a CEFR ${row.level} learner and marks vocabulary with ` +
    "Russian glosses. Score every candidate from 1 (bad) to 5 (perfect) on:\n" +
    "- meaning: all facts of the source kept, nothing invented or distorted (simplification for " +
    "the level is fine, losing or changing meaning is not)\n" +
    "- grammar: correct, natural German (articles, cases, word order, verb choice)\n" +
    `- levelFit: vocabulary and sentence structure suit ${row.level}\n` +
    "- glosses: picked words are worth learning at this level, each Russian gloss is correct for " +
    "this context, and each marked German item is a sensible unit\n" +
    "List every concrete error briefly (quote the wrong German). A failed candidate scores 1 on " +
    "everything. Judge each candidate independently.\n\n" +
    `## Source (Russian)\n${row.source}\n\n${candidates}`
  );
}

async function callJudge(prompt: string): Promise<Evaluation[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${judgeModel}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey! },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              evaluations: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    label: { type: "STRING" },
                    meaning: { type: "INTEGER" },
                    grammar: { type: "INTEGER" },
                    levelFit: { type: "INTEGER" },
                    glosses: { type: "INTEGER" },
                    errors: { type: "ARRAY", items: { type: "STRING" } },
                  },
                  required: ["label", "meaning", "grammar", "levelFit", "glosses", "errors"],
                },
              },
            },
            required: ["evaluations"],
          },
        },
      }),
      signal: AbortSignal.timeout(120_000),
    },
  );
  if (!response.ok)
    throw new Error(`judge call failed: ${response.status} ${await response.text()}`);
  const body = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = body.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
  if (!text) throw new Error("judge returned no text");
  return (JSON.parse(text) as { evaluations: Evaluation[] }).evaluations;
}

const perModel = runs.map(() => ({ meaning: 0, grammar: 0, levelFit: 0, glosses: 0, n: 0 }));
const details: string[] = [];

for (let p = 0; p < paragraphCount; p++) {
  const row = runs[0]!.rows[p]!;
  const order = shuffledRunIndexes(row.index);
  let evaluations: Evaluation[] = [];
  for (let attempt = 0; attempt < 2 && evaluations.length === 0; attempt++) {
    try {
      evaluations = await callJudge(judgePrompt(row, order));
    } catch (err) {
      console.error(`paragraph ${row.index}: ${(err as Error).message}`);
    }
  }
  details.push(`## ${row.index}. ${row.genre} · ${row.level}`, "", `> ${row.source}`, "");
  for (const [pos, runIdx] of order.entries()) {
    const e = evaluations.find((x) => x.label.replace(/candidate\s*/i, "").trim() === LETTERS[pos]);
    const r = runs[runIdx]!.rows[p]!;
    details.push(
      `**${runs[runIdx]!.model}** (shown as ${LETTERS[pos]})`,
      "",
      `${r.german ?? "—"}`,
      "",
    );
    if (!e) {
      details.push("_no judge score_", "");
      continue;
    }
    const m = perModel[runIdx]!;
    m.meaning += e.meaning;
    m.grammar += e.grammar;
    m.levelFit += e.levelFit;
    m.glosses += e.glosses;
    m.n++;
    details.push(
      `meaning ${e.meaning} · grammar ${e.grammar} · level ${e.levelFit} · glosses ${e.glosses}`,
      ...(e.errors.length ? e.errors.map((x) => `- ${x}`) : ["- no errors listed"]),
      "",
    );
  }
  console.log(`${row.index}/${paragraphCount} judged`);
}

const avg = (v: number, n: number) => (n ? (v / n).toFixed(2) : "—");
const summary = runs
  .map((run, i) => {
    const m = perModel[i]!;
    const overall = m.n ? (m.meaning + m.grammar + m.levelFit + m.glosses) / (4 * m.n) : 0;
    return { run, m, overall };
  })
  .sort((a, b) => b.overall - a.overall);

const lines = [
  "# Model judge report",
  "",
  `- Date: ${new Date().toISOString()}`,
  `- Judge: \`${judgeModel}\` (blind, shuffled letters; same model family as candidates — spot-check)`,
  `- Paragraphs: ${paragraphCount}`,
  "",
  "| Model | Overall | Meaning | Grammar | Level fit | Glosses | $/paragraph | Avg latency | Judged |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ...summary.map(
    ({ run, m, overall }) =>
      `| \`${run.model}\` | ${overall.toFixed(2)} | ${avg(m.meaning, m.n)} | ${avg(m.grammar, m.n)} | ${avg(m.levelFit, m.n)} | ${avg(m.glosses, m.n)} | ${run.costPerParagraph?.toFixed(5) ?? "?"} | ${run.avgLatencyMs} ms | ${m.n}/${paragraphCount} |`,
  ),
  "",
  ...details,
];
writeFileSync("judge-report.md", lines.join("\n"));
console.log("Wrote judge-report.md");
