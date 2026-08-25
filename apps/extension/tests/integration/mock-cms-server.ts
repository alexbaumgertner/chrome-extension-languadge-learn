import http from "node:http";

export type MockCmsMode = "ok" | "fail";

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
    ],
  };
}

/** Implements the three contracts/cms-api-contract.md endpoints with deterministic canned fixtures. */
export function createMockCmsServer() {
  let mode: MockCmsMode = "ok";

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk.toString()));
    req.on("end", () => {
      if (mode === "fail") {
        res.statusCode = 500;
        res.end("mock CMS forced failure");
        return;
      }

      if (req.url === "/api/translate" && req.method === "POST") {
        const parsed = JSON.parse(body || "{}") as { text?: string };
        const requestText = parsed.text ?? "";
        const text =
          "Ich moechte einen Kaffee bestellen und dann in Ruhe die Zeitung lesen. " +
          `(${requestText.slice(0, 12)})`;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(buildTranslateResponse(requestText, text)));
        return;
      }

      if (req.url === "/api/exercises" && req.method === "POST") {
        const parsed = JSON.parse(body || "{}") as { variantText?: string };
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(buildExercisesResponse(parsed.variantText ?? "")));
        return;
      }

      if (req.url === "/api/tts" && req.method === "POST") {
        res.setHeader("Content-Type", "audio/mpeg");
        res.end(Buffer.from([0, 1, 2, 3]));
        return;
      }

      res.statusCode = 404;
      res.end();
    });
  });

  return {
    setMode(next: MockCmsMode): void {
      mode = next;
    },
    listen(port: number): Promise<void> {
      return new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
    },
    close(): Promise<void> {
      if (!server.listening) return Promise.resolve();
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}
