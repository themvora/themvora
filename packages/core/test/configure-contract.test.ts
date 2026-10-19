import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createThemeRuntime, defineTheme, resetDiagnosticEmission } from "../src/index";
import type { ThemeDefinition } from "../src/index";

/**
 * The shared live-configuration contract.
 *
 * Every framework provider, the Web Components element and any caller of
 * `runtime.configure()` go through this one implementation. The matrix below is
 * the behaviour they all inherit, and the assertions are what the adapters are
 * verified against — an adapter that forwards a prop is only correct because
 * this file's semantics are fixed.
 *
 * Cases: a supplied value, a supplied `undefined` (the "removed" shape), an
 * unknown identifier, a catalog that no longer contains the selection, a
 * catalog with nothing usable, and a no-op update.
 */

const theme = (name: string, family: string, mode: "light" | "dark"): ThemeDefinition =>
  defineTheme({
    name,
    meta: { family, mode },
    tokens: { colors: { background: "#ffffff", foreground: "#000000" } },
  }) as ThemeDefinition;

const aLight = theme("a-light", "a", "light");
const aDark = theme("a-dark", "a", "dark");
const bLight = theme("b-light", "b", "light");
const bDark = theme("b-dark", "b", "dark");
const catalog = [aLight, aDark, bLight, bDark];

function make(extra: Record<string, unknown> = {}) {
  return createThemeRuntime({
    themes: catalog,
    dom: false,
    cssVariables: false,
    persistence: null,
    broadcast: null,
    readPersistenceOnInit: false,
    ...extra,
  } as never);
}

const nameOf = (runtime: ReturnType<typeof make>) => String(runtime.store.get().name);

let errorSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetDiagnosticEmission();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  resetDiagnosticEmission();
  errorSpy.mockRestore();
  warnSpy.mockRestore();
});

function emittedCodes(): string[] {
  return [...errorSpy.mock.calls, ...warnSpy.mock.calls]
    .map((call) => (call[1] as { code?: string } | undefined)?.code)
    .filter((code): code is string => typeof code === "string");
}

describe("configure() — a supplied value", () => {
  it("re-resolves to a changed defaultTheme, overriding an explicit selection", () => {
    const runtime = make();
    runtime.selection.setMode("dark");
    expect(nameOf(runtime)).toBe("a-dark");

    runtime.configure({ defaultTheme: "b-dark" });

    expect(nameOf(runtime)).toBe("b-dark");
    expect(runtime.selection.getSelection()).toEqual({ family: "b", mode: "dark" });
  });

  it("applies a resolvable `initial` selection", () => {
    const runtime = make();

    runtime.configure({
      initial: { theme: bDark, selection: { family: "b", mode: "dark" } },
    });

    expect(nameOf(runtime)).toBe("b-dark");
    expect(runtime.selection.getSelection()).toEqual({ family: "b", mode: "dark" });
  });

  it("ignores an unresolvable `initial` selection and keeps the current one", () => {
    const runtime = make();
    runtime.selection.setFamily("b");
    const before = runtime.selection.getSelection();

    runtime.configure({
      initial: {
        theme: theme("ghost", "ghost", "light"),
        selection: { family: "ghost", mode: "light" },
      },
    });

    expect(runtime.selection.getSelection()).toEqual(before);
    expect(nameOf(runtime)).toBe("b-light");
  });

  it("notifies subscribers immediately when a change applies", () => {
    const runtime = make();
    const seen: string[] = [];
    runtime.store.subscribe((next) => seen.push(String(next.name)));

    runtime.configure({ defaultTheme: "b-dark" });

    // Same tick, no reload: the store published the new theme synchronously.
    expect(seen).toEqual(["b-dark"]);
  });
});

describe("configure() — a supplied `undefined`", () => {
  it("treats a supplied defaultTheme of undefined as 'no default' and re-resolves", () => {
    const runtime = make({ defaultTheme: "b-dark" });
    expect(nameOf(runtime)).toBe("b-dark");

    runtime.configure({ defaultTheme: undefined });

    // No default remains, so the catalog's first theme wins. This is the shape
    // a provider would forward if it *did* forward a removed prop; the
    // providers deliberately do not (see the adapter contract tests).
    expect(nameOf(runtime)).toBe("a-light");
    expect(runtime.selection.getSelection()).toEqual({ family: "a", mode: "light" });
  });

  it("leaves the catalog alone when `themes` is omitted", () => {
    const runtime = make();
    runtime.configure({ themes: undefined });
    expect(runtime.themes.map((t) => String(t.name))).toEqual([
      "a-light",
      "a-dark",
      "b-light",
      "b-dark",
    ]);
  });
});

describe("configure() — catalog changes", () => {
  it("preserves a selection the new catalog still contains", () => {
    const runtime = make();
    runtime.selection.setFamily("b");

    runtime.configure({ themes: [aLight, aDark, bLight, bDark] });

    expect(nameOf(runtime)).toBe("b-light");
    expect(runtime.selection.getFamily()).toBe("b");
  });

  it("reconciles a selection whose family left the catalog", () => {
    const runtime = make();
    runtime.selection.setFamily("b");

    runtime.configure({ themes: [aLight, aDark] });

    expect(nameOf(runtime)).toBe("a-light");
    expect(runtime.selection.getFamily()).toBe("a");
    expect(runtime.themes.map((t) => String(t.name))).toEqual(["a-light", "a-dark"]);
  });

  it("falls back to the neutral catalog when nothing usable remains", () => {
    const runtime = make();

    runtime.configure({ themes: [] });

    expect(runtime.themes.map((t) => String(t.name))).toEqual(["light", "dark"]);
    expect(nameOf(runtime)).toBe("light");
    expect(emittedCodes()).toContain("TV_THEME_NEUTRAL_FALLBACK");
  });

  it("falls back to the neutral catalog when every entry is unusable", () => {
    const runtime = make();

    runtime.configure({ themes: [{ nope: true } as unknown as ThemeDefinition] });

    expect(runtime.themes.map((t) => String(t.name))).toEqual(["light", "dark"]);
    expect(emittedCodes()).toContain("TV_THEME_NEUTRAL_FALLBACK");
  });

  it("recovers when a usable catalog is supplied after the fallback", () => {
    const runtime = make();
    runtime.configure({ themes: [] });
    expect(nameOf(runtime)).toBe("light");

    runtime.configure({ themes: [bLight, bDark] });

    expect(nameOf(runtime)).toBe("b-light");
    expect(runtime.selection.getFamily()).toBe("b");
  });
});

describe("configure() — unknown identifiers", () => {
  it("reports an unknown initialFamily and resolves to a registered family", () => {
    const runtime = make();

    runtime.configure({ initialFamily: "ghost" });

    expect(runtime.selection.getFamily()).toBe("a");
    expect(nameOf(runtime)).toBe("a-light");
    expect(emittedCodes()).toContain("TV_THEME_FAMILY_UNKNOWN");
  });

  it("resolves an unknown defaultTheme to the catalog's first theme", () => {
    const runtime = make({ defaultTheme: "a-light" });
    runtime.selection.setFamily("b");

    runtime.configure({ defaultTheme: "ghost" });

    // Documented: "Unknown name resolves to the fallback". The selection is
    // re-resolved because a default was supplied, so it lands on catalog[0].
    expect(nameOf(runtime)).toBe("a-light");
  });
});

describe("configure() — no-op updates", () => {
  it("does not notify when the catalog is unchanged by value", () => {
    const runtime = make();
    const seen: string[] = [];
    runtime.store.subscribe((next) => seen.push(String(next.name)));

    runtime.configure({ themes: [aLight, aDark, bLight, bDark] });
    runtime.configure({});
    runtime.configure({ themes: undefined });

    expect(seen).toEqual([]);
  });

  it("does not recreate the runtime", () => {
    const runtime = make();
    runtime.configure({ themes: [aLight, aDark] });
    runtime.configure({ defaultTheme: "a-dark" });

    // The same object is still the caller's handle, and its history survived.
    expect(runtime.store.get()).toBeTruthy();
    expect(typeof runtime.history.getHistory).toBe("function");
  });
});


describe("runtime.registry.subscribe() — the catalog signal", () => {
  it("fires when a configure() update changes the catalog", () => {
    const runtime = make();
    const catalogs: string[][] = [];
    runtime.registry.subscribe(() => {
      catalogs.push(runtime.themes.map((t) => String(t.name)));
    });

    runtime.configure({ themes: [aLight, aDark] });

    expect(catalogs).toEqual([["a-light", "a-dark"]]);
    // After the store and the selection, in the same task.
    expect(String(runtime.store.get().name)).toBe("a-light");
    expect(runtime.selection.getSelection()).toEqual({ family: "a", mode: "light" });
  });

  it("does not fire for a selection-only update", () => {
    const runtime = make();
    let calls = 0;
    runtime.registry.subscribe(() => {
      calls += 1;
    });

    runtime.configure({ defaultTheme: "b-dark" });
    runtime.configure({});

    expect(calls).toBe(0);
  });

  it("fires even when the active theme is preserved", () => {
    // The point of a dedicated signal: the catalog moved while the selection
    // stayed put. `store.subscribe` reports the active theme, not the catalog,
    // so it cannot answer "is my theme still here?".
    const runtime = make();
    runtime.selection.setFamily("b");
    const themes: string[][] = [];
    const storeEvents: string[] = [];
    runtime.store.subscribe((next) => storeEvents.push(String(next.name)));
    runtime.registry.subscribe(() => {
      themes.push(runtime.themes.map((t) => String(t.name)));
    });

    runtime.configure({ themes: [aLight, aDark, bLight, bDark, theme("c-light", "c", "light")] });

    expect(String(runtime.store.get().name)).toBe("b-light");
    expect(storeEvents).toEqual(["b-light"]);
    expect(themes).toHaveLength(1);
    expect(themes[0]).toContain("c-light");
  });

  it("fires once for a catalog that both loses and gains themes", () => {
    // registry.batch coalesces the clear + re-register into one notification.
    const runtime = make();
    let calls = 0;
    runtime.registry.subscribe(() => {
      calls += 1;
    });

    runtime.configure({ themes: [bLight, bDark, theme("c-light", "c", "light")] });

    expect(calls).toBe(1);
    expect(runtime.themes.map((t) => String(t.name))).toEqual([
      "b-light",
      "b-dark",
      "c-light",
    ]);
  });

  it("fires when a pack is installed with use()", () => {
    const runtime = make();
    const themes: string[][] = [];
    runtime.registry.subscribe(() => {
      themes.push(runtime.themes.map((t) => String(t.name)));
    });

    runtime.use({ name: "extra", themes: [theme("c-light", "c", "light")] });

    expect(themes).toHaveLength(1);
    expect(themes[0]).toContain("c-light");
  });

  it("fires when a snapshot is restored", () => {
    const runtime = make();
    const snapshot = runtime.snapshot();
    let calls = 0;
    runtime.registry.subscribe(() => {
      calls += 1;
    });

    runtime.restore(snapshot);

    expect(calls).toBe(1);
  });

  it("stops after unsubscribe, and unsubscribing twice is safe", () => {
    const runtime = make();
    let calls = 0;
    const off = runtime.registry.subscribe(() => {
      calls += 1;
    });

    runtime.configure({ themes: [aLight] });
    off();
    off();
    runtime.configure({ themes: [aLight, aDark] });

    expect(calls).toBe(1);
  });

  it("de-duplicates an identical catalog", () => {
    const runtime = make();
    let calls = 0;
    runtime.registry.subscribe(() => {
      calls += 1;
    });

    runtime.configure({ themes: catalog });

    // `configure` short-circuits on an unchanged catalog, so the registry is
    // never touched and no consumer churns.
    expect(calls).toBe(0);
  });
});

describe("runtime.themes — one array, kept in place", () => {
  it("returns the same array across reads and mutations", () => {
    const runtime = make();
    const first = runtime.themes;

    expect(first).toBe(runtime.themes);

    runtime.configure({ themes: [aLight, aDark] });

    // The reference a consumer captured still describes the live catalog, and
    // a fresh read is the same object — the two views cannot disagree.
    expect(first).toBe(runtime.themes);
    expect(first.map((t) => String(t.name))).toEqual(["a-light", "a-dark"]);
    expect(runtime.registry.themes).toBe(runtime.themes);
  });

  it("reflects a direct registry mutation without a configure()", () => {
    const runtime = make();
    const view = runtime.themes;

    runtime.registry.unregister("b-light");
    runtime.registry.unregister("b-dark");

    expect(view.map((t) => String(t.name))).toEqual(["a-light", "a-dark"]);
    expect(runtime.themes).toBe(view);
  });

  it("reflects a theme registered straight onto the registry", () => {
    const runtime = make();
    const view = runtime.themes;

    runtime.registry.register(theme("c-light", "c", "light"));

    expect(view.map((t) => String(t.name))).toContain("c-light");
    expect(runtime.themes).toBe(view);
  });
});

describe("configure() vs use() — one catalog, two writers", () => {
  it("removes a pack installed with use() when configure() supplies the old catalog", () => {
    // `use()` writes to the registry without going through `configure`, so the
    // "last applied catalog" is behind the live one. Comparing against it made
    // this call look like a no-op and the pack could never be removed.
    const runtime = make();
    const before = [...runtime.themes];

    runtime.use({ name: "extra", themes: [theme("c-light", "c", "light")] });
    expect(runtime.themes.map((t) => String(t.name))).toContain("c-light");

    runtime.configure({ themes: before });

    expect(runtime.themes.map((t) => String(t.name))).toEqual([
      "a-light",
      "a-dark",
      "b-light",
      "b-dark",
    ]);
  });

  it("keeps a pack installed with use() when only the selection is configured", () => {
    // The mirror image: a `defaultTheme` update must not read the stale applied
    // catalog as "the caller wants these themes back".
    const runtime = make();
    runtime.use({ name: "extra", themes: [theme("c-light", "c", "light")] });

    runtime.configure({ defaultTheme: "a-dark" });

    expect(runtime.themes.map((t) => String(t.name))).toContain("c-light");
    expect(String(runtime.store.get().name)).toBe("a-dark");
  });

  it("treats a catalog that matches the live registry as unchanged", () => {
    const runtime = make();
    runtime.use({ name: "extra", themes: [theme("c-light", "c", "light")] });
    let calls = 0;
    runtime.registry.subscribe(() => {
      calls += 1;
    });

    runtime.configure({ themes: [...runtime.themes] });

    expect(calls).toBe(0);
  });
});
