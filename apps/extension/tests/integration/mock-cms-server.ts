import { createLoopbackServer, withCors } from "./loopback-server";

/**
 * "exercises-fail" / "report-fail": everything else works, that endpoint returns 500.
 * "limit": translate answers 429 like an exhausted daily allowance. "cors-fail": every response
 * lacks the CORS grant, so the browser blocks it although the server is up.
 */
export type MockCmsMode = "ok" | "fail" | "exercises-fail" | "report-fail" | "limit" | "cors-fail";

/** A request paragraph text containing this marker gets a short, low-vocabulary German variant back. */
export const SHORT_PARAGRAPH_MARKER = "SHORT_PARA_MARKER";
const SHORT_VARIANT_TEXT = "Kurzer Satz mit Kaffee.";

function markVocab(text: string, words: Array<{ word: string; russian: string }>) {
  return words
    .map(({ word, russian }) => {
      const start = text.indexOf(word);
      if (start === -1) return null;
      return { start, end: start + word.length, german: word, russian };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);
}

function buildTranslateResponse(requestText: string, text: string) {
  if (requestText.includes(SHORT_PARAGRAPH_MARKER)) {
    return {
      text: SHORT_VARIANT_TEXT,
      markedVocab: markVocab(SHORT_VARIANT_TEXT, [{ word: "Kaffee", russian: "кофе" }]),
    };
  }
  const words: Array<{ word: string; russian: string }> = [
    { word: "moechte", russian: "хотел бы" },
    { word: "Ruhe", russian: "спокойствие" },
  ];
  return { text, markedVocab: markVocab(text, words) };
}

function buildExercisesResponse(variantText: string) {
  if (variantText === SHORT_VARIANT_TEXT) {
    // Too short/low-vocabulary to support all four kinds — only word-pairing is buildable.
    return {
      exercises: [{ kind: "word-pairing", pairs: [{ german: "Kaffee", russian: "кофе" }] }],
    };
  }
  return {
    exercises: [
      {
        kind: "fill-blank",
        sourceSentence: variantText,
        blankedSentence: variantText.replace("moechte", "___"),
        answer: "moechte",
      },
      {
        kind: "multiple-choice",
        sourceSentence: variantText,
        blankedSentence: variantText.replace("Ruhe", "___"),
        options: ["Ruhe", "Lärm"],
        correctIndex: 0,
      },
      {
        kind: "word-pairing",
        pairs: [
          { german: "Kaffee", russian: "кофе" },
          { german: "Zeitung", russian: "газета" },
        ],
      },
      { kind: "audio-dictation", sourceSentence: variantText, answer: variantText },
      { kind: "article-choice", noun: "Zeitung", article: "die", russian: "газета" },
    ],
  };
}

/** Implements the CMS endpoints the extension calls with deterministic canned fixtures, and records request bodies. */
export function createMockCmsServer() {
  let mode: MockCmsMode = "ok";
  const callCounts = { translate: 0, exercises: 0 };
  const requests = {
    translate: [] as unknown[],
    events: [] as Array<{ installId: string; events: Array<Record<string, unknown>> }>,
    report: [] as Array<Record<string, unknown>>,
  };

  // While set, translate requests are counted and recorded but answered only once it resolves.
  let translateGate: Promise<void> | null = null;

  const server = createLoopbackServer(
    withCors(
      (req, res) => {
        let body = "";
        req.on("data", (chunk: Buffer) => (body += chunk.toString()));
        req.on("end", async () => {
          if (mode === "fail") {
            res.statusCode = 500;
            res.end("mock CMS forced failure");
            return;
          }

          if (req.url === "/api/events" && req.method === "POST") {
            requests.events.push(JSON.parse(body));
            res.statusCode = 204;
            res.end();
            return;
          }

          if (req.url === "/api/report" && req.method === "POST") {
            if (mode === "report-fail") {
              res.statusCode = 500;
              res.end();
              return;
            }
            requests.report.push(JSON.parse(body));
            res.statusCode = 204;
            res.end();
            return;
          }

          if (req.url === "/api/translate" && req.method === "POST") {
            callCounts.translate++;
            if (mode === "limit") {
              res.statusCode = 429;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "allowance-exhausted" }));
              return;
            }
            requests.translate.push(JSON.parse(body || "{}"));
            await translateGate;
            const parsed = JSON.parse(body || "{}") as { text?: string };
            const requestText = parsed.text ?? "";
            const text =
              "Ich moechte einen Kaffee bestellen und dann in Ruhe die Zeitung lesen. " +
              `(${requestText.slice(0, 12)})`;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                ...buildTranslateResponse(requestText, text),
                cache: "miss",
                model: "mock-model",
                promptVersion: "2",
              }),
            );
            return;
          }

          if (req.url === "/api/exercises" && req.method === "POST") {
            callCounts.exercises++;
            if (mode === "exercises-fail") {
              res.statusCode = 500;
              res.end("mock CMS forced exercises failure");
              return;
            }
            const parsed = JSON.parse(body || "{}") as { variantText?: string };
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(buildExercisesResponse(parsed.variantText ?? "")));
            return;
          }

          res.statusCode = 404;
          res.end();
        });
      },
      () => mode !== "cors-fail",
    ),
  );

  return {
    callCounts,
    requests,
    setMode(next: MockCmsMode): void {
      mode = next;
    },
    /** Holds every translate response until the returned function is called. */
    holdTranslate(): () => void {
      let release!: () => void;
      translateGate = new Promise((resolve) => (release = resolve));
      return () => {
        translateGate = null;
        release();
      };
    },
    listen: server.listen,
    close: server.close,
  };
}
