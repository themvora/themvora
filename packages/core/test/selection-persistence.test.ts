// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createThemeRuntime,
  defineTheme,
  generateTheme,
  type ThemeDefinition,
  type ThemeSelectionPersistenceAdapter,
  type ThemeSelectionState,
} from "../src/index";

/**
 * What a selection is persisted *as*.
 *
 * The contract is deliberately narrow: the stored value is the selection
 * identity — `{ family, mode }` — and nothing else. It must not contain the theme
 * definition, its tokens or its metadata, and it must resolve against whatever
 * the provider supplies next time, including themes the application defined or
 * generated itself.
 */

const custom = defineTheme({
  name: "brand-light",
  meta: { family: "brand", mode: "light", label: "Brand" },
  tokens: { colors: { background: "#f5f3ff", foreground: "#1e1b4b" } },
}) as ThemeDefinition;

const customDark = defineTheme({
  name: "brand-dark",
  meta: { family: "brand", mode: "dark", label: "Brand" },
  tokens: { colors: { background: "#1e1b4b", foreground: "#f5f3ff" } },
}) as ThemeDefinition;

const preset = defineTheme({
  name: "oat-light",
  meta: { family: "oat", mode: "light" },
  tokens: { colors: { background: "#fdf6e3" } },
}) as ThemeDefinition;

/** A storage adapter that records every write, like `localStorage` would. */
function recordingPersistence(initial: ThemeSelectionState | null = null) {
  const writes: string[] = [];
  let value = initial;
  const adapter: ThemeSelectionPersistenceAdapter = {
    get: () => value,
    set: (next) => {
      writes.push(JSON.stringify(next));
      value = next;
    },
    remove: () => {
      writes.push("<removed>");
      value = null;
    },
    subscribe: () => () => {},
  };
  return { adapter, writes, get value() { return value; } };
}

const base = {
  dom: false as const,
  cssVariables: false as const,
  broadcast: null,
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("persisting a user-defined selection", () => {
  it("stores the selection identity, not the theme definition", () => {
    const store = recordingPersistence();
    const runtime = createThemeRuntime({
      ...base,
      themes: [preset, custom, customDark],
      defaultTheme: "oat-light",
      persistence: store.adapter,
    });

    runtime.selection.setFamily("brand");
    runtime.selection.setMode("dark");

    expect(store.value).toEqual({ family: "brand", mode: "dark" });
    // No tokens, no metadata, no name — only the identity.
    const written = store.writes.join("");
    expect(written).not.toContain("f5f3ff");
    expect(written).not.toContain("tokens");
    expect(written).not.toContain("brand-dark");
  });

  it("resolves a stored custom family on the next mount", () => {
    const store = recordingPersistence({ family: "brand", mode: "dark" });

    const runtime = createThemeRuntime({
      ...base,
      themes: [preset, custom, customDark],
      defaultTheme: "oat-light",
      persistence: store.adapter,
    });

    expect(runtime.store.get().name).toBe("brand-dark");
    expect(runtime.selection.getSelection()).toEqual({ family: "brand", mode: "dark" });
  });

  it("persists a generated theme's selection like any other", () => {
    const generated = generateTheme({ seed: "#635BFF", family: "brand" });
    const themes = [preset, generated.light, generated.dark] as ThemeDefinition[];
    const store = recordingPersistence();

    const runtime = createThemeRuntime({ ...base, themes, persistence: store.adapter });
    runtime.selection.setFamily("brand");

    expect(store.value).toEqual({ family: "brand", mode: expect.any(String) });

    // A fresh runtime over the same registry resolves it — the identity is all
    // that was stored.
    const reloaded = createThemeRuntime({ ...base, themes, persistence: store.adapter });
    expect(reloaded.selection.getFamily()).toBe("brand");
    expect(reloaded.store.get().name).toBe(runtime.store.get().name);
  });

  it("falls back safely when the stored family is gone", () => {
    const store = recordingPersistence({ family: "brand", mode: "dark" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const runtime = createThemeRuntime({
      ...base,
      themes: [preset],
      defaultTheme: "oat-light",
      persistence: store.adapter,
    });

    expect(runtime.store.get().name).toBe("oat-light");
    expect(runtime.selection.getFamily()).toBe("oat");
    warn.mockRestore();
  });

  it("does not write storage on a plain rerender", () => {
    const store = recordingPersistence();
    const runtime = createThemeRuntime({
      ...base,
      themes: [preset, custom],
      persistence: store.adapter,
    });

    runtime.selection.setFamily("brand");
    const writes = store.writes.length;

    // What a provider does on every render.
    runtime.configure({ themes: [preset, custom] });
    runtime.configure({ defaultTheme: undefined });
    runtime.configure({ themes: [preset, custom] });

    expect(store.writes).toHaveLength(writes);
  });

  it("keeps applying the theme when storage throws", () => {
    const throwing: ThemeSelectionPersistenceAdapter = {
      get: () => {
        throw new Error("blocked");
      },
      set: () => {
        throw new Error("blocked");
      },
      remove: () => {
        throw new Error("blocked");
      },
      subscribe: () => () => {},
    };
    vi.spyOn(console, "warn").mockImplementation(() => {});

    // The read throws at creation; the runtime still comes up on the default.
    const runtime = createThemeRuntime({
      ...base,
      themes: [preset, custom],
      defaultTheme: "oat-light",
      persistence: throwing,
    });

    expect(runtime.store.get().name).toBe("oat-light");

    // A write that throws must not stop the selection from applying.
    expect(() => runtime.selection.setFamily("brand")).not.toThrow();
    expect(runtime.store.get().name).toBe("brand-light");
  });
});
