import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createThemeRuntime,
  defineTheme,
  getNeutralThemes,
  resetDiagnosticEmission,
  type ThemeDefinition,
  type ThemeRuntime,
} from "../src";

/**
 * The live-configuration contract: a runtime whose `themes` / `defaultTheme` /
 * `initial*` props change after creation must re-resolve immediately, without a
 * remount — and must never serve a stale theme.
 */

const theme = (name: string, family: string, mode: "light" | "dark" = "light"): ThemeDefinition => ({
  name,
  meta: { family, mode },
  tokens: { colors: { background: mode === "dark" ? "#101014" : "#ffffff", primary: "#635BFF" } },
});

const runtimeOptions = {
  dom: false as const,
  cssVariables: false as const,
  persistence: null,
  broadcast: null,
};

function makeRuntime(themes: readonly ThemeDefinition[], extra: Record<string, unknown> = {}) {
  return createThemeRuntime({
    themes,
    ...runtimeOptions,
    ...extra,
  } as any);
}

function themeName(runtime: ThemeRuntime<any>): string {
  return runtime.store.get().name;
}

afterEach(() => {
  resetDiagnosticEmission();
  vi.restoreAllMocks();
});

describe("runtime.configure — catalog changes", () => {
  it("applies a replaced catalog", () => {
    const runtime = makeRuntime([theme("a-light", "a"), theme("a-dark", "a", "dark")]);

    runtime.configure({ themes: [theme("b-light", "b"), theme("b-dark", "b", "dark")] });

    expect(runtime.themes.map((t) => t.name)).toEqual(["b-light", "b-dark"]);
    expect(themeName(runtime)).toBe("b-light");
  });

  it("applies a catalog that adds a theme", () => {
    const runtime = makeRuntime([theme("a-light", "a")]);
    runtime.configure({ themes: [theme("a-light", "a"), theme("c-light", "c")] });
    expect(runtime.themes.map((t) => t.name)).toEqual(["a-light", "c-light"]);
  });

  it("falls back when the current theme is removed, preserving a valid selection", () => {
    const runtime = makeRuntime([
      theme("a-light", "a"),
      theme("b-light", "b"),
      theme("b-dark", "b", "dark"),
    ]);
    runtime.selection.setFamily("a");
    expect(themeName(runtime)).toBe("a-light");

    // "a" disappears; the selection is no longer resolvable → fall back to the
    // first usable theme, deterministically.
    runtime.configure({ themes: [theme("b-light", "b"), theme("b-dark", "b", "dark")] });

    expect(themeName(runtime)).toBe("b-light");
    expect(runtime.selection.getFamily()).toBe("b");
  });

  it("preserves a still-valid selection when the catalog changes", () => {
    const runtime = makeRuntime([
      theme("a-light", "a"),
      theme("a-dark", "a", "dark"),
      theme("b-light", "b"),
    ]);
    runtime.selection.setFamily("b");
    expect(themeName(runtime)).toBe("b-light");

    // Add an unrelated family; "b" is untouched and must stay selected.
    runtime.configure({
      themes: [theme("a-light", "a"), theme("a-dark", "a", "dark"), theme("b-light", "b"), theme("c-light", "c")],
    });

    expect(runtime.selection.getFamily()).toBe("b");
    expect(themeName(runtime)).toBe("b-light");
  });

  it("re-resolves to a replacement theme when only the definition changes", () => {
    const runtime = makeRuntime([theme("a-light", "a")]);
    const replacement = { ...theme("a-light", "a"), meta: { family: "a", mode: "light" as const, label: "A2" } };
    runtime.configure({ themes: [replacement] });
    expect(runtime.store.get().meta?.label).toBe("A2");
  });
});

describe("runtime.configure — fallbacks", () => {
  it("resolves the canonical neutral theme for an empty collection", () => {
    const neutral = getNeutralThemes();
    const runtime = makeRuntime([theme("a-light", "a")]);

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    runtime.configure({ themes: [] });

    expect(runtime.themes.map((t) => t.name)).toEqual(neutral.map((t) => t.name));
    expect(themeName(runtime)).toBe(neutral[0]!.name);
    expect(warn).toHaveBeenCalled();
  });

  it("resolves the neutral theme for a collection of only invalid entries", () => {
    const neutral = getNeutralThemes();
    const runtime = makeRuntime([theme("a-light", "a")]);

    vi.spyOn(console, "warn").mockImplementation(() => {});
    runtime.configure({ themes: [{ nope: true } as unknown as ThemeDefinition] });

    expect(runtime.themes.map((t) => t.name)).toEqual(neutral.map((t) => t.name));
  });

  it("does not change the catalog when `themes` is omitted", () => {
    const runtime = makeRuntime([theme("a-light", "a")]);
    runtime.configure({ defaultTheme: "a-light" });
    expect(runtime.themes.map((t) => t.name)).toEqual(["a-light"]);
  });
});

describe("runtime.configure — selection props", () => {
  it("re-resolves when defaultTheme changes", () => {
    const runtime = makeRuntime([theme("a-light", "a"), theme("b-light", "b")]);
    expect(themeName(runtime)).toBe("a-light");

    runtime.configure({ themes: runtime.themes as ThemeDefinition[], defaultTheme: "b-light" });

    expect(themeName(runtime)).toBe("b-light");
    expect(runtime.selection.getFamily()).toBe("b");
  });

  it("applies several changed props together", () => {
    const runtime = makeRuntime([theme("a-light", "a")]);

    runtime.configure({
      themes: [theme("x-light", "x"), theme("y-light", "y")],
      defaultTheme: "y-light",
    });

    expect(themeName(runtime)).toBe("y-light");
  });

  it("is a no-op (no notification) when nothing relevant changed", () => {
    const runtime = makeRuntime([theme("a-light", "a")]);
    let storeNotifications = 0;
    runtime.store.subscribe(() => {
      storeNotifications += 1;
    });

    const catalog = runtime.themes as ThemeDefinition[];
    runtime.configure({ themes: catalog });
    runtime.configure({ themes: catalog });

    expect(storeNotifications).toBe(0);
  });

  it("does not fight a user selection on an unrelated render", () => {
    const runtime = makeRuntime([theme("a-light", "a"), theme("b-light", "b")]);
    const catalog = runtime.themes as ThemeDefinition[];

    runtime.selection.setFamily("b");
    // A parent re-render forwards the same props with no explicit selection
    // request, so the user's choice must survive.
    runtime.configure({ themes: catalog });
    runtime.configure({ themes: catalog });

    expect(runtime.selection.getFamily()).toBe("b");
    expect(themeName(runtime)).toBe("b-light");
  });
});

describe("runtime.configure — diagnostics", () => {
  it("emits a single error for an unknown family, and again for a new one", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const runtime = makeRuntime([theme("a-light", "a")]);

    runtime.configure({ themes: runtime.themes as ThemeDefinition[], initialFamily: "ghost" });
    runtime.configure({ themes: runtime.themes as ThemeDefinition[], initialFamily: "ghost" });
    expect(error).toHaveBeenCalledTimes(1);

    runtime.configure({ themes: runtime.themes as ThemeDefinition[], initialFamily: "phantom" });
    expect(error).toHaveBeenCalledTimes(2);
  });

  it("recovers when the invalid family becomes valid", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const runtime = makeRuntime([theme("a-light", "a")]);

    runtime.configure({ themes: runtime.themes as ThemeDefinition[], initialFamily: "ghost" });
    expect(themeName(runtime)).toBe("a-light");

    runtime.configure({
      themes: [theme("a-light", "a"), theme("ghost-light", "ghost")],
      initialFamily: "ghost",
    });

    expect(runtime.selection.getFamily()).toBe("ghost");
    expect(themeName(runtime)).toBe("ghost-light");
  });

  it("names the family it actually resolved to, not the first registered one", () => {
    // The resolver falls back to the *default theme's* family, which is not
    // necessarily the catalog's first family. A message that names the wrong
    // one sends the reader looking in the wrong place.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const runtime = makeRuntime([theme("a-light", "a"), theme("b-light", "b")]);

    runtime.configure({ defaultTheme: "b-light" });
    runtime.configure({ initialFamily: "ghost" });

    const message = String(error.mock.calls.at(-1)?.[0] ?? "");
    expect(runtime.selection.getFamily()).toBe("b");
    expect(message).toContain('resolved to "b"');
    expect(message).not.toContain('resolved to "a"');
  });
});

describe("runtime.configure — atomicity, isolation and disposal", () => {
  it("notifies the registry once and the store once per configuration change", () => {
    const runtime = makeRuntime([theme("a-light", "a")]);
    let registryNotifications = 0;
    let storeNotifications = 0;
    runtime.registry.subscribe(() => {
      registryNotifications += 1;
    });
    runtime.store.subscribe(() => {
      storeNotifications += 1;
    });

    runtime.configure({ themes: [theme("x-light", "x"), theme("x-dark", "x", "dark")] });

    expect(registryNotifications).toBe(1);
    expect(storeNotifications).toBe(1);
  });

  it("keeps two runtimes isolated", () => {
    const a = makeRuntime([theme("a-light", "a")]);
    const b = makeRuntime([theme("b-light", "b")]);

    a.configure({ themes: [theme("z-light", "z")] });

    expect(a.store.get().name).toBe("z-light");
    expect(b.store.get().name).toBe("b-light");
    expect(b.themes.map((t) => t.name)).toEqual(["b-light"]);
  });

  it("is safe to call after destroy", () => {
    const runtime = makeRuntime([theme("a-light", "a")]);
    runtime.destroy();
    expect(() => runtime.configure({ themes: [theme("b-light", "b")] })).not.toThrow();
    expect(() => runtime.configure({ defaultTheme: "b-light" })).not.toThrow();
  });
});
