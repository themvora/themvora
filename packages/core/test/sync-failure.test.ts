// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createThemeRuntime,
  getBuiltInThemes,
  resetDiagnosticEmission,
  type ThemeSelectionBroadcastAdapter,
  type ThemeSelectionPersistenceAdapter,
  type ThemeSelectionState,
} from "../src";

/**
 * F6 — `persistence.set()` and `broadcast.post()` ran unguarded *after* the new
 * state had already been assigned, and *before* the theme was applied and the
 * listeners were notified.
 *
 * With any throwing adapter — the Next/Remix/Astro storage bugs, a custom
 * adapter, a closed `BroadcastChannel` — the result was a half-updated runtime:
 * `getMode()`/`getSelection()` reported the new value while the store still held
 * the old theme, so the screen showed the old theme and no React listener fired
 * to correct it. The exception then escaped to the caller.
 *
 * These tests drive the **public runtime**, which is how `setMode`/`setFamily`
 * are actually reached (`createThemeSelectionController` is internal).
 */

const themes = getBuiltInThemes();

function throwingPersistence(): ThemeSelectionPersistenceAdapter {
  return {
    get: () => null,
    set() {
      throw new DOMException("quota", "QuotaExceededError");
    },
    remove() {
      throw new Error("blocked");
    },
    subscribe: () => () => {},
  };
}

function throwingBroadcast(): ThemeSelectionBroadcastAdapter {
  return {
    post() {
      throw new DOMException("channel closed", "InvalidStateError");
    },
    subscribe: () => () => {},
    destroy() {},
  };
}

function runtime(options: {
  persistence?: ThemeSelectionPersistenceAdapter | null;
  broadcast?: ThemeSelectionBroadcastAdapter | null;
}) {
  return createThemeRuntime({
    themes,
    defaultTheme: "light",
    initialMode: "light",
    persistence: options.persistence ?? null,
    broadcast: options.broadcast ?? null,
  });
}

function diagnosticFrom(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.at(-1)?.[1] as
    | { code?: string; level?: string; context?: { api?: string } }
    | undefined;
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetDiagnosticEmission();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
});

describe("runtime with a throwing persistence adapter (F6)", () => {
  it("still applies the theme and notifies listeners", () => {
    const rt = runtime({ persistence: throwingPersistence() });

    const seen: ThemeSelectionState[] = [];
    rt.selection.subscribe((selection) => seen.push(selection));

    expect(() => rt.selection.setMode("dark")).not.toThrow();

    // The three halves agree: reported selection, store, and the theme a
    // listener would render.
    expect(rt.selection.getMode()).toBe("dark");
    expect(String(rt.snapshot().theme.name)).toBe("dark");
    expect(seen.at(-1)).toEqual({ mode: "dark", family: "default" });

    rt.destroy();
  });

  it("reports the failure as TV_SYNC_FAILED", () => {
    const rt = runtime({ persistence: throwingPersistence() });

    rt.selection.setMode("dark");

    const diagnostic = diagnosticFrom(warn);
    expect(diagnostic?.code).toBe("TV_SYNC_FAILED");
    expect(diagnostic?.level).toBe("warning");
    expect(diagnostic?.context?.api).toBe("setMode");

    rt.destroy();
  });

  it("applies a family change exactly once", () => {
    const rt = runtime({ persistence: throwingPersistence() });

    const applied: string[] = [];
    rt.store.subscribe((theme) => applied.push(String(theme.name)));

    rt.selection.setFamily("plum");

    expect(applied).toEqual(["plum-light"]);

    rt.destroy();
  });
});

describe("runtime with a throwing broadcast adapter (F6)", () => {
  it("applies and notifies locally", () => {
    const rt = runtime({ broadcast: throwingBroadcast() });

    const seen: ThemeSelectionState[] = [];
    rt.selection.subscribe((selection) => seen.push(selection));

    expect(() => rt.selection.setFamily("plum")).not.toThrow();

    expect(rt.selection.getFamily()).toBe("plum");
    expect(String(rt.snapshot().theme.name)).toBe("plum-light");
    expect(seen.at(-1)).toEqual({ mode: "light", family: "plum" });

    rt.destroy();
  });

  it("still persists when only the broadcast fails", () => {
    const saved: ThemeSelectionState[] = [];
    const rt = runtime({
      persistence: {
        get: () => null,
        set: (value) => saved.push(value),
        remove() {},
        subscribe: () => () => {},
      },
      broadcast: throwingBroadcast(),
    });

    rt.selection.setMode("dark");

    // A broadcast failure must not skip the persistence write.
    expect(saved).toEqual([{ mode: "dark", family: "default" }]);

    rt.destroy();
  });

  it("runs both adapters when persistence throws first", () => {
    const posted: ThemeSelectionState[] = [];
    const rt = runtime({
      persistence: throwingPersistence(),
      broadcast: {
        post: (value) => posted.push(value),
        subscribe: () => () => {},
        destroy() {},
      },
    });

    rt.selection.setMode("dark");

    expect(posted).toEqual([{ mode: "dark", family: "default" }]);

    rt.destroy();
  });
});
