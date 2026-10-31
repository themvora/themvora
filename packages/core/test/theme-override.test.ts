import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createThemeRuntime,
  defineTheme,
  resolveThemeOverride,
  themeOverrideKey,
  type ThemeDefinition,
  type ThemeSelectionPersistenceAdapter,
  type ThemeSelectionState,
} from "../src/index";

/**
 * `themeOverride`: an explicit, one-shot, non-persisting theme request.
 *
 * `defaultTheme` stays a fallback; the override is the "apply this even though
 * something else is saved" signal. The cases below are the contract every
 * framework provider inherits through `runtime.configure()`.
 */

const theme = (name: string, family: string, mode: "light" | "dark"): ThemeDefinition =>
  defineTheme({
    name,
    meta: { family, mode },
    tokens: { colors: { background: mode === "dark" ? "#000" : "#fff" } },
  }) as ThemeDefinition;

const catalog = [
  theme("a-light", "a", "light"),
  theme("a-dark", "a", "dark"),
  theme("b-light", "b", "light"),
  theme("b-dark", "b", "dark"),
];

function fakePersistence(initial: ThemeSelectionState | null) {
  const store = { value: initial };
  const set = vi.fn((value: ThemeSelectionState) => {
    store.value = value;
  });
  const remove = vi.fn(() => {
    store.value = null;
  });
  const adapter: ThemeSelectionPersistenceAdapter = {
    get: () => store.value,
    set,
    remove,
    subscribe: () => () => {},
  };
  return { adapter, set, remove, store };
}

const base = {
  themes: catalog,
  dom: false as const,
  cssVariables: false as const,
  broadcast: null,
};

function make(extra: Record<string, unknown> = {}) {
  return createThemeRuntime({ ...base, ...extra } as never);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveThemeOverride", () => {
  const selection = { family: "a", mode: "light" as const };

  it("resolves a theme name to its family and mode", () => {
    expect(resolveThemeOverride(catalog, "b-dark", selection)).toEqual({
      family: "b",
      mode: "dark",
    });
  });

  it("inherits the missing half of a partial request", () => {
    expect(resolveThemeOverride(catalog, { family: "b" }, selection)).toEqual({
      family: "b",
      mode: "light",
    });
    expect(resolveThemeOverride(catalog, { mode: "dark" }, selection)).toEqual({
      family: "a",
      mode: "dark",
    });
  });

  it("returns null for an unknown name, family or mode", () => {
    expect(resolveThemeOverride(catalog, "nope", selection)).toBeNull();
    expect(resolveThemeOverride(catalog, { family: "nope" }, selection)).toBeNull();
    expect(
      resolveThemeOverride(catalog, { mode: "sepia" as never }, selection),
    ).toBeNull();
  });

  it("returns null for an absent or empty request", () => {
    expect(resolveThemeOverride(catalog, undefined, selection)).toBeNull();
    expect(resolveThemeOverride(catalog, {}, selection)).toBeNull();
    expect(resolveThemeOverride(catalog, "", selection)).toBeNull();
  });
});

describe("themeOverrideKey", () => {
  it("is equal for two objects that request the same theme", () => {
    expect(themeOverrideKey({ family: "a", mode: "dark" })).toBe(
      themeOverrideKey({ family: "a", mode: "dark" }),
    );
    expect(themeOverrideKey("a-dark")).toBe("name:a-dark");
  });

  it("differs when the request differs", () => {
    expect(themeOverrideKey({ family: "a", mode: "dark" })).not.toBe(
      themeOverrideKey({ family: "a", mode: "light" }),
    );
    expect(themeOverrideKey(undefined)).toBeNull();
  });

  it("canonicalises a theme name against the catalog", () => {
    expect(themeOverrideKey("a-dark", catalog)).toBe(
      themeOverrideKey({ family: "a", mode: "dark" }, catalog),
    );
    // Without a catalog the name form keys on the name.
    expect(themeOverrideKey("a-dark")).toBe("name:a-dark");
  });

  it("keys a partial request on what was asked for, not on the base", () => {
    const partial = themeOverrideKey({ family: "a" }, catalog);

    expect(partial).toBe("request:a:");
    expect(partial).not.toBe(themeOverrideKey({ family: "a", mode: "light" }, catalog));
  });
});

describe("themeOverride at creation", () => {
  it("wins over a conflicting persisted family", () => {
    const { adapter } = fakePersistence({ family: "b", mode: "dark" });
    const runtime = make({ persistence: adapter, themeOverride: "a-light" });

    expect(runtime.store.get().name).toBe("a-light");
    expect(runtime.selection.getSelection()).toEqual({ family: "a", mode: "light" });
  });

  it("wins over `defaultTheme`", () => {
    const runtime = make({ defaultTheme: "b-light", themeOverride: "a-dark" });
    expect(runtime.store.get().name).toBe("a-dark");
  });

  it("wins over an explicit `initial`", () => {
    const runtime = make({
      initial: {
        theme: catalog[2]!,
        selection: { family: "b", mode: "light" },
      },
      themeOverride: "a-dark",
    });

    expect(runtime.store.get().name).toBe("a-dark");
  });

  it("applies when storage is unavailable or throws", () => {
    const throwing: ThemeSelectionPersistenceAdapter = {
      get() {
        throw new Error("blocked");
      },
      set() {
        throw new Error("blocked");
      },
      remove() {
        throw new Error("blocked");
      },
      subscribe() {
        throw new Error("blocked");
      },
    };

    // A throwing `get()` at creation is the storage-blocked case; the override
    // must still be what is applied.
    expect(() => make({ persistence: throwing, themeOverride: "b-dark" })).toThrow();
    const runtime = make({ persistence: null, themeOverride: "b-dark" });
    expect(runtime.store.get().name).toBe("b-dark");
  });

  it("reports and ignores an override it cannot resolve", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});

    const runtime = make({ defaultTheme: "b-light", themeOverride: "nope" });

    expect(runtime.store.get().name).toBe("b-light");
    const output = [...errors.mock.calls, ...warn.mock.calls, ...debug.mock.calls]
      .flat()
      .join(" ");
    expect(output).toContain("themeOverride");
  });

  it("keeps `defaultTheme` fallback semantics when no override is given", () => {
    const { adapter } = fakePersistence({ family: "a", mode: "dark" });
    const persisted = make({ persistence: adapter, defaultTheme: "b-light" });
    expect(persisted.store.get().name).toBe("a-dark");

    const fresh = make({ persistence: null, defaultTheme: "b-light" });
    expect(fresh.store.get().name).toBe("b-light");
  });

  it("puts the override in the server snapshot", () => {
    const runtime = make({ defaultTheme: "b-light", themeOverride: "a-dark" });

    expect(runtime.initial.theme.name).toBe("a-dark");
    expect(runtime.initial.selection).toEqual({ family: "a", mode: "dark" });
  });
});

describe("themeOverride on configure", () => {
  it("applies a changed override exactly once", () => {
    const runtime = make();
    const seen: string[] = [];
    runtime.store.subscribe((next) => seen.push(String(next.name)));

    runtime.configure({ themeOverride: "b-dark" });
    expect(runtime.store.get().name).toBe("b-dark");

    runtime.configure({ themeOverride: "b-dark" });
    runtime.configure({ themeOverride: { family: "b", mode: "dark" } });
    expect(seen).toEqual(["b-dark"]);
  });

  it("does not re-assert the override after a manual selection", () => {
    const runtime = make();
    runtime.configure({ themeOverride: "b-dark" });
    runtime.selection.setFamily("a");
    expect(runtime.selection.getFamily()).toBe("a");

    // An ordinary parent re-render forwards the same override again.
    runtime.configure({ themeOverride: "b-dark" });
    runtime.configure({ themeOverride: { family: "b", mode: "dark" } });

    expect(runtime.selection.getFamily()).toBe("a");
  });

  it("applies a later, different override again", () => {
    const runtime = make();
    runtime.configure({ themeOverride: "b-dark" });
    runtime.selection.setFamily("a");

    runtime.configure({ themeOverride: "a-light" });

    expect(runtime.store.get().name).toBe("a-light");
  });

  it("does not write or clear persistence", () => {
    const { adapter, set, remove } = fakePersistence({ family: "b", mode: "dark" });
    const runtime = make({ persistence: adapter });

    runtime.configure({ themeOverride: "a-light" });

    expect(runtime.store.get().name).toBe("a-light");
    expect(set).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("leaves a later manual selection persisting normally", () => {
    const { adapter, set } = fakePersistence({ family: "b", mode: "dark" });
    const runtime = make({ persistence: adapter });

    runtime.configure({ themeOverride: "a-light" });
    expect(set).not.toHaveBeenCalled();

    runtime.selection.setFamily("a");
    runtime.selection.setMode("dark");

    expect(set).toHaveBeenCalled();
    expect(adapter.get()).toEqual({ family: "a", mode: "dark" });
  });

  it("retries an override once the catalog gains the theme it names", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const runtime = make();

    runtime.configure({ themes: [catalog[0]!, catalog[1]!], themeOverride: "b-dark" });
    expect(runtime.store.get().name).toBe("a-light");

    runtime.configure({ themes: catalog });
    expect(runtime.store.get().name).toBe("b-dark");
    warn.mockRestore();
  });

  it("does not disturb a catalog-only update when the override is unchanged", () => {
    const runtime = make();
    runtime.configure({ themeOverride: "b-dark" });
    runtime.selection.setFamily("a");

    runtime.configure({ themes: [...catalog] });

    expect(runtime.selection.getFamily()).toBe("a");
  });

  it("keeps a manual selection when the override prop is removed", () => {
    // The snapshot is only the right answer when nothing else happened in
    // between; a choice the visitor made while the override was active is newer.
    const runtime = make();
    runtime.configure({ themeOverride: "b-dark" });
    runtime.selection.setFamily("a");

    runtime.configure({ themeOverride: undefined });

    expect(runtime.selection.getFamily()).toBe("a");
  });
});

describe("themeOverride removal", () => {
  it("restores the selection the override was layered over", () => {
    const runtime = make({ defaultTheme: "b-light" });
    expect(runtime.store.get().name).toBe("b-light");

    runtime.configure({ themeOverride: "a-dark" });
    expect(runtime.store.get().name).toBe("a-dark");

    runtime.configure({ themeOverride: undefined });

    expect(runtime.store.get().name).toBe("b-light");
    expect(runtime.selection.getSelection()).toEqual({ family: "b", mode: "light" });
  });

  it("restores a persisted selection, not the default theme", () => {
    const { adapter } = fakePersistence({ family: "b", mode: "dark" });
    const runtime = make({ persistence: adapter, defaultTheme: "a-light" });
    expect(runtime.store.get().name).toBe("b-dark");

    runtime.configure({ themeOverride: "a-light" });
    expect(runtime.store.get().name).toBe("a-light");

    runtime.configure({ themeOverride: undefined });

    // The visitor's saved selection is the layer underneath — `defaultTheme` is
    // only a fallback and must not take over.
    expect(runtime.store.get().name).toBe("b-dark");
  });

  it("applies the restore immediately, in the same call", () => {
    const runtime = make({ defaultTheme: "b-light" });
    runtime.configure({ themeOverride: "a-dark" });

    const seen: string[] = [];
    runtime.store.subscribe((next) => seen.push(String(next.name)));

    runtime.configure({ themeOverride: undefined });

    // No reload, no remount, no extra tick.
    expect(seen).toEqual(["b-light"]);
    expect(runtime.store.get().name).toBe("b-light");
  });

  it("restores across a chain of overrides to the state before the first", () => {
    const runtime = make({ defaultTheme: "b-light" });
    runtime.configure({ themeOverride: "a-dark" });
    runtime.configure({ themeOverride: "a-light" });
    runtime.configure({ themeOverride: "b-dark" });

    runtime.configure({ themeOverride: undefined });

    expect(runtime.store.get().name).toBe("b-light");
  });

  it("does not write storage when it restores", () => {
    const { adapter, set, remove } = fakePersistence({ family: "b", mode: "dark" });
    const runtime = make({ persistence: adapter });

    runtime.configure({ themeOverride: "a-light" });
    runtime.configure({ themeOverride: undefined });

    expect(runtime.store.get().name).toBe("b-dark");
    expect(set).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("re-applies the same override after it was removed", () => {
    const runtime = make({ defaultTheme: "b-light" });

    runtime.configure({ themeOverride: "a-dark" });
    runtime.configure({ themeOverride: undefined });
    expect(runtime.store.get().name).toBe("b-light");

    // The key was cleared on removal, so this is a new transition, not
    // "already honoured".
    runtime.configure({ themeOverride: "a-dark" });
    expect(runtime.store.get().name).toBe("a-dark");
  });

  it("does not resurrect a removed override on an unrelated rerender", () => {
    const runtime = make({ defaultTheme: "b-light" });
    runtime.configure({ themeOverride: "a-dark" });
    runtime.configure({ themeOverride: undefined });

    // A provider that keeps forwarding `undefined` (which every provider does
    // once it has owned the prop) must stay a no-op.
    runtime.configure({ themeOverride: undefined });
    runtime.configure({ themeOverride: undefined });

    expect(runtime.store.get().name).toBe("b-light");
  });

  it("keeps the newer manual selection instead of the snapshot", () => {
    const runtime = make({ defaultTheme: "b-light" });
    runtime.configure({ themeOverride: "a-dark" });

    // The visitor picks something themselves while the override is active.
    runtime.selection.setFamily("a");
    runtime.selection.setMode("light");

    runtime.configure({ themeOverride: undefined });

    expect(runtime.selection.getSelection()).toEqual({ family: "a", mode: "light" });
  });

  it("still restores after a manual mode change that the override superseded", () => {
    const runtime = make({ defaultTheme: "b-light" });
    runtime.configure({ themeOverride: "a-dark" });

    // Manual selection *before* the override is applied is part of the layer.
    runtime.configure({ themeOverride: undefined });
    runtime.selection.setMode("dark");
    runtime.configure({ themeOverride: "a-light" });

    runtime.configure({ themeOverride: undefined });

    expect(runtime.selection.getSelection()).toEqual({ family: "b", mode: "dark" });
  });

  it("normalises a snapshot whose family left the catalog", () => {
    const runtime = make({ defaultTheme: "b-light" });
    runtime.configure({ themeOverride: "a-dark" });

    // The family underneath disappears while the override covers it.
    runtime.configure({ themes: [catalog[2]!, catalog[3]!] });
    runtime.configure({ themeOverride: undefined });

    expect(runtime.selection.getFamily()).toBe("b");
  });

  it("does not loop on an invalid override", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const runtime = make({ defaultTheme: "b-light" });

    const seen: string[] = [];
    runtime.store.subscribe((next) => seen.push(String(next.name)));

    runtime.configure({ themeOverride: "nope" });
    runtime.configure({ themeOverride: "nope" });

    expect(seen).toEqual([]);
    expect(runtime.store.get().name).toBe("b-light");
    warn.mockRestore();
  });

  it("restores the layer even when the override was set at creation", () => {
    const runtime = make({ defaultTheme: "b-light", themeOverride: "a-dark" });
    expect(runtime.store.get().name).toBe("a-dark");

    runtime.configure({ themeOverride: undefined });

    expect(runtime.store.get().name).toBe("b-light");
  });
});
