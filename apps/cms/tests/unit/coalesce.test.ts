import { describe, expect, it, vi } from "vitest";
import { createCoalescingMap } from "../../src/cache/coalesce";

describe("coalescing map", () => {
  it("shares one underlying invocation across concurrent calls for the same key", async () => {
    const coalescing = createCoalescingMap<string>();
    let invocations = 0;
    const fn = () =>
      new Promise<string>((resolve) => {
        invocations++;
        setTimeout(() => resolve("result"), 10);
      });

    const [a, b, c] = await Promise.all([
      coalescing.run("key1", fn),
      coalescing.run("key1", fn),
      coalescing.run("key1", fn),
    ]);

    expect(invocations).toBe(1);
    expect(a).toBe("result");
    expect(b).toBe("result");
    expect(c).toBe("result");
  });

  it("clears the map entry after settling so a later call starts fresh", async () => {
    const coalescing = createCoalescingMap<string>();
    const fn = vi.fn().mockResolvedValue("result");

    await coalescing.run("key1", fn);
    await coalescing.run("key1", fn);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("clears the map entry even when the shared invocation fails", async () => {
    const coalescing = createCoalescingMap<string>();
    const failing = vi.fn().mockRejectedValue(new Error("boom"));
    const succeeding = vi.fn().mockResolvedValue("recovered");

    await expect(coalescing.run("key1", failing)).rejects.toThrow("boom");
    const result = await coalescing.run("key1", succeeding);

    expect(result).toBe("recovered");
    expect(succeeding).toHaveBeenCalledTimes(1);
  });
});
