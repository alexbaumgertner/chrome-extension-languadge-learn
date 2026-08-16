/**
 * Mocks fetch calls to the Google Cloud Translation API and Gemini API REST endpoints
 * (mirrors apps/extension/tests/integration/mock-cms-server.ts's canned-fixture pattern),
 * so integration tests don't depend on real API keys or network access, and can assert
 * exact call counts for coalescing/caching/allowance/resilience scenarios.
 *
 * Gemini prompt format this mock parses (must match apps/cms/src/pipeline/adapt-level.ts):
 *   `... for a ${level} learner ... topic "${topic}" ...\n\nRaw German text: ${rawText}`
 */

export type MockProviderMode = "ok" | "fail" | "malformed";

export interface AdaptedResult {
  text: string;
  vocabTerms: string[];
}

export interface MockProvidersOptions {
  rawTranslation?: (text: string) => string;
  adapted?: (raw: string, level: string, topic: string) => AdaptedResult;
  gloss?: (term: string) => string;
}

export interface MockProvidersController {
  setMode(mode: MockProviderMode): void;
  /** Make the next N calls to a provider fail with a 500, regardless of `mode`, then resume `mode` behavior. */
  failNext(provider: "translate" | "gemini", count?: number): void;
  callCounts: { translateRaw: number; translateGloss: number; gemini: number };
  install(): void;
  restore(): void;
}

const LEVEL_REGEX = /for a (\S+) learner/;
const TOPIC_REGEX = /topic "([^"]*)"/;
const RAW_TEXT_REGEX = /Raw German text: ([\s\S]*)$/;

export function createMockProviders(options: MockProvidersOptions = {}): MockProvidersController {
  let mode: MockProviderMode = "ok";
  const pendingFailures = { translate: 0, gemini: 0 };
  const callCounts = { translateRaw: 0, translateGloss: 0, gemini: 0 };
  const originalFetch = globalThis.fetch;

  const rawTranslation = options.rawTranslation ?? ((text: string) => `DE: ${text}`);
  const adapted =
    options.adapted ??
    ((raw: string, level: string, topic: string) => ({
      text: `[${level}/${topic}] ${raw}`,
      vocabTerms: [] as string[],
    }));
  const gloss = options.gloss ?? ((term: string) => `RU:${term}`);

  async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? input : input.toString();
    const body = init?.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : {};

    if (url.includes("translation.googleapis.com")) {
      const target = body.target as string;
      if (target === "de") callCounts.translateRaw++;
      else callCounts.translateGloss++;

      if (pendingFailures.translate > 0) {
        pendingFailures.translate--;
        return new Response("mock translate failure", { status: 500 });
      }
      if (mode === "fail") return new Response("mock translate failure", { status: 500 });
      if (mode === "malformed")
        return new Response(JSON.stringify({ oops: true }), { status: 200 });

      const q = body.q as string | string[];
      const translations = Array.isArray(q)
        ? q.map((term) => ({ translatedText: gloss(term) }))
        : [{ translatedText: rawTranslation(q) }];
      return new Response(JSON.stringify({ data: { translations } }), { status: 200 });
    }

    if (url.includes("generativelanguage.googleapis.com")) {
      callCounts.gemini++;

      if (pendingFailures.gemini > 0) {
        pendingFailures.gemini--;
        return new Response("mock gemini failure", { status: 500 });
      }
      if (mode === "fail") return new Response("mock gemini failure", { status: 500 });
      if (mode === "malformed") {
        return new Response(JSON.stringify({ candidates: [] }), { status: 200 });
      }

      const prompt = ((body.contents as Array<{ parts: Array<{ text: string }> }>)?.[0]?.parts?.[0]
        ?.text ?? "") as string;
      const level = LEVEL_REGEX.exec(prompt)?.[1] ?? "unknown";
      const topic = TOPIC_REGEX.exec(prompt)?.[1] ?? "unknown";
      const raw = RAW_TEXT_REGEX.exec(prompt)?.[1] ?? "";
      const result = adapted(raw, level, topic);

      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(result) }] } }],
        }),
        { status: 200 },
      );
    }

    return originalFetch(input, init);
  }

  return {
    setMode(next) {
      mode = next;
    },
    failNext(provider, count = 1) {
      pendingFailures[provider] += count;
    },
    callCounts,
    install() {
      globalThis.fetch = mockFetch as typeof fetch;
    },
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}
