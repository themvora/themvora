/**
 * Per-root coordination tests.
 *
 * The property that matters is asymmetric: tasks on the *same* root must not
 * interleave, and tasks on *different* roots must not wait for each other.
 * A coordinator that simply serialised everything would pass the first and fail
 * the second, so both are asserted.
 */
import { describe, expect, it } from "vitest";

import { createRootSessions, rootKey } from "../src/services/rootSessions";

/** Wait, for ordering assertions. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("rootKey", () => {
  it("treats trailing separators as the same root", () => {
    expect(rootKey("C:/app/")).toBe("C:/app");
    expect(rootKey("C:/app\\\\")).toBe("C:/app");
    expect(rootKey("C:/app")).toBe("C:/app");
  });

  it("preserves spaces and case", () => {
    // Two spellings of one directory must share a lock; two genuinely different
    // directories must not be merged.
    expect(rootKey("C:/My Projects/The App/")).toBe("C:/My Projects/The App");
    expect(rootKey("C:/App")).not.toBe(rootKey("C:/app"));
  });
});

describe("createRootSessions", () => {
  it("does not interleave work on one root", async () => {
    const sessions = createRootSessions();
    const order: string[] = [];

    const first = sessions.run("C:/app", async () => {
      order.push("a:start");
      await delay(20);
      order.push("a:end");
    });

    const second = sessions.run("C:/app", async () => {
      order.push("b:start");
      order.push("b:end");
    });

    await Promise.all([first, second]);

    // Queued, not raced: the second task starts only after the first finishes.
    expect(order).toEqual(["a:start", "a:end", "b:start", "b:end"]);
  });

  it("treats two spellings of one root as the same root", async () => {
    const sessions = createRootSessions();
    const order: string[] = [];

    const first = sessions.run("C:/My App", async () => {
      order.push("a:start");
      await delay(15);
      order.push("a:end");
    });
    const second = sessions.run("C:/My App/", async () => {
      order.push("b:start");
    });

    await Promise.all([first, second]);
    expect(order).toEqual(["a:start", "a:end", "b:start"]);
  });

  it("keeps different roots independent", async () => {
    const sessions = createRootSessions();
    const started: string[] = [];
    const finished: string[] = [];

    const slow = sessions.run("C:/one", async () => {
      started.push("one");
      await delay(30);
      finished.push("one");
    });

    const quick = sessions.run("C:/two", async () => {
      started.push("two");
      await delay(5);
      finished.push("two");
    });

    await Promise.all([slow, quick]);

    // `two` starts before `one` finishes, so the roots did not queue together.
    expect(started).toEqual(["one", "two"]);
    expect(finished).toEqual(["two", "one"]);
  });

  it("does not let a failed task stall the root", async () => {
    const sessions = createRootSessions();

    const failing = sessions.run("C:/app", async () => {
      throw new Error("boom");
    });

    await expect(failing).rejects.toThrow("boom");

    // The next task still runs, and the rejection reached its caller.
    await expect(sessions.run("C:/app", async () => "ok")).resolves.toBe("ok");
  });

  it("reports how much work a root has", async () => {
    const sessions = createRootSessions();

    expect(sessions.pending("C:/app")).toBe(0);

    const first = sessions.run("C:/app", () => delay(10));
    const second = sessions.run("C:/app", () => delay(10));
    expect(sessions.pending("C:/app")).toBe(2);

    await Promise.all([first, second]);
    expect(sessions.pending("C:/app")).toBe(0);
  });

  it("propagates each task's own result", async () => {
    const sessions = createRootSessions();

    await expect(sessions.run("C:/app", async () => 42)).resolves.toBe(42);
    await expect(sessions.run("C:/app", async () => ({ ok: true }))).resolves.toEqual({ ok: true });
  });
});
