import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushEvents, recordEvent, recordInstallIfNew } from "@/lib/metrics/events";

let store: Record<string, unknown>;
let sent: Array<{ installId: string; events: Array<{ name: string }> }>;
let respond: () => Promise<Response>;

beforeEach(() => {
  store = {};
  sent = [];
  respond = async () => new Response(null, { status: 204 });
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: {
        get: async (key: string) => (key in store ? { [key]: structuredClone(store[key]) } : {}),
        set: async (items: Record<string, unknown>) => void Object.assign(store, items),
      },
    },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      const res = await respond();
      if (res.ok) sent.push(JSON.parse(init.body as string));
      return res;
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

const names = () => sent.flatMap((batch) => batch.events.map((e) => e.name));
const queued = () => (store.metricsQueue as unknown[] | undefined) ?? [];

describe("metric events", () => {
  it("sends the install event once, then each usage event, all with the same install ID", async () => {
    await recordInstallIfNew();
    await recordInstallIfNew(); // an update or reload must not count as a second install
    await recordEvent({ name: "paragraph_translated", cache: "miss", latencyMs: 1200 });
    await recordEvent({ name: "exercise_completed" });

    expect(names()).toEqual(["install", "paragraph_translated", "exercise_completed"]);
    expect(new Set(sent.map((b) => b.installId)).size).toBe(1);
    expect(sent[0]!.installId).toBe(store.installId);
    expect(queued()).toEqual([]);
  });

  it("records an install event first when the ID had to be recreated (storage cleared)", async () => {
    await recordEvent({ name: "exercise_completed" });
    expect(names()).toEqual(["install", "exercise_completed"]);
  });

  it("keeps events while offline and sends them on the next flush", async () => {
    await recordInstallIfNew();
    respond = async () => {
      throw new TypeError("Failed to fetch");
    };
    await recordEvent({ name: "client_error", error: "translate-offline", httpStatus: null });
    expect(queued()).toHaveLength(1);

    respond = async () => new Response(null, { status: 204 });
    await flushEvents();
    expect(names()).toEqual(["install", "client_error"]);
    expect(queued()).toEqual([]);
  });

  it("keeps events on a server error but drops a batch the server rejects as invalid", async () => {
    await recordInstallIfNew();
    respond = async () => new Response(null, { status: 503 });
    await recordEvent({ name: "exercise_completed" });
    expect(queued()).toHaveLength(1);

    respond = async () => new Response(null, { status: 400 });
    await flushEvents();
    expect(queued()).toEqual([]);
  });

  it("loses no event when many are recorded at once", async () => {
    await recordInstallIfNew();
    respond = async () => new Response(null, { status: 503 });
    await Promise.all(
      Array.from({ length: 10 }, () => recordEvent({ name: "exercise_completed" })),
    );
    expect(queued()).toHaveLength(10);
  });
});
