import { beforeEach, describe, expect, it } from "vitest";
import { InstallIdSchema } from "@sprachweise/shared";
import { getOrCreateInstallId } from "@/lib/metrics/install-id";

let store: Record<string, unknown>;

beforeEach(() => {
  store = {};
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: {
        get: async (key: string) => (key in store ? { [key]: store[key] } : {}),
        set: async (items: Record<string, unknown>) => void Object.assign(store, items),
      },
    },
  };
});

describe("getOrCreateInstallId", () => {
  it("creates a random UUID v4 once and returns the same ID afterwards", async () => {
    const first = await getOrCreateInstallId();
    expect(first.created).toBe(true);
    expect(InstallIdSchema.safeParse(first.installId).success).toBe(true);
    expect(store.installId).toBe(first.installId);

    const second = await getOrCreateInstallId();
    expect(second).toEqual({ installId: first.installId, created: false });
  });

  it("generates exactly one ID when called concurrently on first run", async () => {
    const results = await Promise.all([getOrCreateInstallId(), getOrCreateInstallId()]);
    expect(results[0].installId).toBe(results[1].installId);
    expect(results.filter((r) => r.created)).toHaveLength(1);
  });

  it("replaces a malformed stored value with a fresh ID", async () => {
    store.installId = "user@example.com";
    const result = await getOrCreateInstallId();
    expect(result.created).toBe(true);
    expect(result.installId).not.toBe("user@example.com");
  });
});
