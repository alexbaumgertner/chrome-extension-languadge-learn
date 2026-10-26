/**
 * Mocks fetch calls to the Gemini API REST endpoint (mirrors
 * apps/extension/tests/integration/mock-cms-server.ts's canned-fixture pattern), so integration
 * tests don't depend on real API keys or network access, and can assert exact call counts for
 * coalescing/caching/allowance/resilience scenarios.
 *
 * Gemini prompt format this mock parses (must match apps/cms/src/pipeline/translate.ts):
 *   `...\n\nLevel: ${level}\nSource paragraph:\n${sourceText}`
 */

/** "config-error": a 400 like Gemini returns for an unsupported thinking level. */
export type MockProviderMode = "ok" | "fail" | "malformed" | "config-error";

export interface TranslatedResult {
  text: string;
  vocab: Array<{ german: string; russian: string }>;
}

export interface MockProvidersOptions {
  translate?: (source: string, level: string) => TranslatedResult;
  /** Used for prompts with a `Mode:` line (apps/cms/src/pipeline/rewrite.ts). */
  rewrite?: (source: string, level: string, mode: string) => TranslatedResult;
}

export interface MockProvidersController {
  setMode(mode: MockProviderMode): void;
  /** Make the next N Gemini calls fail with a 500, regardless of `mode`, then resume `mode` behavior. */
  failNext(provider: "gemini", count?: number): void;
  callCounts: { gemini: number };
  /** The `x-goog-api-key` header of every Gemini call made, in order. */
  apiKeys: string[];
  /** The prompt text of every Gemini call that got as far as being answered, in order. */
  prompts: string[];
  /** Every Gemini request URL, in order. */
  urls: string[];
  install(): void;
  restore(): void;
}

const MODE_REGEX = /\nMode: (\S+)\n/;
const LEVEL_REGEX = /\nLevel: (\S+)\n/;
const SOURCE_REGEX = /\nSource paragraph:\n([\s\S]*)$/;

export function createMockProviders(options: MockProvidersOptions = {}): MockProvidersController {
  let mode: MockProviderMode = "ok";
  const pendingFailures = { gemini: 0 };
  const callCounts = { gemini: 0 };
  const apiKeys: string[] = [];
  const urls: string[] = [];
  const prompts: string[] = [];
  const originalFetch = globalThis.fetch;

  const rewrite =
    options.rewrite ??
    ((source: string, level: string, mode: string) => ({
      text: `[${mode}/${level}] DE: ${source}`,
      vocab: [],
    }));

  const translate =
    options.translate ??
    ((source: string, level: string) => ({ text: `[${level}] DE: ${source}`, vocab: [] }));

  async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? input : input.toString();

    if (url.includes("generativelanguage.googleapis.com")) {
      callCounts.gemini++;
      urls.push(url);
      apiKeys.push(new Headers(init?.headers).get("x-goog-api-key") ?? "");

      if (pendingFailures.gemini > 0) {
        pendingFailures.gemini--;
        return new Response("mock gemini failure", { status: 500 });
      }
      if (mode === "fail") return new Response("mock gemini failure", { status: 500 });
      if (mode === "config-error") {
        return new Response(
          JSON.stringify({
            error: { message: "Thinking level MINIMAL is not supported for this model." },
          }),
          { status: 400 },
        );
      }
      if (mode === "malformed") {
        return new Response(JSON.stringify({ candidates: [] }), { status: 200 });
      }

      const body = JSON.parse(init?.body as string) as {
        contents: Array<{ parts: Array<{ text: string }> }>;
      };
      const prompt = body.contents[0]?.parts[0]?.text ?? "";
      prompts.push(prompt);
      const level = LEVEL_REGEX.exec(prompt)?.[1] ?? "unknown";
      const source = SOURCE_REGEX.exec(prompt)?.[1] ?? "";
      const rewriteMode = MODE_REGEX.exec(prompt)?.[1];
      const result = rewriteMode ? rewrite(source, level, rewriteMode) : translate(source, level);

      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(result) }] } }],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 },
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
    apiKeys,
    prompts,
    urls,
    install() {
      globalThis.fetch = mockFetch as typeof fetch;
    },
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}
