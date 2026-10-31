import { describe, expect, it } from "vitest";
import {
  createThemeRuntime,
  defineTheme,
  resolveSelection,
  resolveThemeOverride,
  resolveThemeReference,
  themeOverrideKey,
  type ThemeDefinition,
} from "../src/index";

/**
 * One resolver for every naming form.
 *
 * `defaultTheme`, `themeOverride`, `initialFamily` and the pre-paint bootstrap
 * all accept a **variant** name (`cocoa-dark`) or a **family** name (`cocoa`).
 * These tests pin what each form means, so the four entry points cannot drift.
 */

const theme = (name: string, family: string, mode: "light" | "dark"): ThemeDefinition =>
  defineTheme({
    name,
    meta: { family, mode },
    tokens: { colors: { background: mode === "dark" ? "#000" : "#fff" } },
  }) as ThemeDefinition;

const catalog = [
  theme("oat-light", "oat", "light"),
  theme("oat-dark", "oat", "dark"),
  theme("cocoa-light", "cocoa", "light"),
  theme("cocoa-dark", "cocoa", "dark"),
];

describe("resolveThemeReference", () => {
  it("resolves an exact variant and carries its mode", () => {
    const resolved = resolveThemeReference(catalog, "cocoa-dark");

    expect(resolved).not.toBeNull();
    expect(resolved!.kind).toBe("variant");
    expect(resolved!.theme.name).toBe("cocoa-dark");
    expect(resolved!.family).toBe("cocoa");
    expect(resolved!.mode).toBe("dark");
  });

  it("resolves a family using the requested mode", () => {
    const light = resolveThemeReference(catalog, "cocoa", { mode: "light" });
    const dark = resolveThemeReference(catalog, "cocoa", { mode: "dark" });

    expect(light!.kind).toBe("family");
    expect(light!.theme.name).toBe("cocoa-light");
    // A family states no mode of its own — the caller's contract decides.
    expect(light!.mode).toBeUndefined();
    expect(dark!.theme.name).toBe("cocoa-dark");
  });

  it("defaults a family to its light variant, not to whatever comes first", () => {
    // `cocoa-dark` is first in this catalog; the family default must still be
    // the light variant.
    const reversed = [...catalog].reverse();
    expect(resolveThemeReference(reversed, "cocoa")!.theme.name).toBe("cocoa-light");
  });

  it("resolves 'system' through prefersDark", () => {
    expect(
      resolveThemeReference(catalog, "cocoa", { mode: "system", prefersDark: true })!.theme.name,
    ).toBe("cocoa-dark");
    expect(
      resolveThemeReference(catalog, "cocoa", { mode: "system", prefersDark: false })!.theme.name,
    ).toBe("cocoa-light");
  });

  it("returns null for a name the provider was not given", () => {
    expect(resolveThemeReference(catalog, "berry")).toBeNull();
    expect(resolveThemeReference(catalog, "berry-light")).toBeNull();
    expect(resolveThemeReference(catalog, "")).toBeNull();
    expect(resolveThemeReference(catalog, "   ")).toBeNull();
    expect(resolveThemeReference(catalog, undefined)).toBeNull();
  });

  it("prefers a variant name over a family name of the same text", () => {
    // A theme literally named `oat` and a family `oat` can coexist; the exact
    // definition is the more specific reading.
    const ambiguous = [...catalog, theme("oat", "special", "light")];
    const resolved = resolveThemeReference(ambiguous, "oat");

    expect(resolved!.kind).toBe("variant");
    expect(resolved!.theme.name).toBe("oat");
    expect(resolved!.family).toBe("special");
  });

  it("is isolated per catalog — no global preset is consulted", () => {
    const onlyCocoa = [catalog[2]!, catalog[3]!];

    expect(resolveThemeReference(onlyCocoa, "cocoa")!.theme.name).toBe("cocoa-light");
    // `oat` exists in the built-in catalog, but not in this provider's.
    expect(resolveThemeReference(onlyCocoa, "oat")).toBeNull();
  });

  it("resolves generated and user-defined themes like any other", () => {
    const generated = defineTheme({
      name: "brand-light",
      meta: { family: "brand", mode: "light", generation: { kind: "generated", algorithm: "semantic-v2", seed: "#635BFF" } },
      tokens: { colors: { background: "#f5f3ff" } },
    }) as ThemeDefinition;

    expect(resolveThemeReference([generated], "brand")!.theme.name).toBe("brand-light");
    expect(resolveThemeReference([generated], "brand-light")!.kind).toBe("variant");
  });
});

describe("resolveSelection — both naming forms", () => {
  it("takes a variant as defaultTheme and adopts its mode", () => {
    expect(resolveSelection({ themes: catalog, defaultTheme: "cocoa-dark" })).toEqual({
      family: "cocoa",
      mode: "dark",
    });
  });

  it("takes a family as defaultTheme and uses the family default", () => {
    expect(resolveSelection({ themes: catalog, defaultTheme: "cocoa" })).toEqual({
      family: "cocoa",
      mode: "light",
    });
  });

  it("lets initialMode pick the mode inside a family defaultTheme", () => {
    expect(
      resolveSelection({ themes: catalog, defaultTheme: "cocoa", initialMode: "dark" }),
    ).toEqual({ family: "cocoa", mode: "dark" });
  });

  it("normalises a variant supplied as initialFamily", () => {
    expect(resolveSelection({ themes: catalog, initialFamily: "cocoa-dark" })).toEqual({
      family: "cocoa",
      mode: "dark",
    });
  });

  it("lets an explicit initialMode win over a variant's own mode", () => {
    // The two props must never silently disagree: the explicit mode is the
    // caller's stated intent.
    expect(
      resolveSelection({
        themes: catalog,
        initialFamily: "cocoa-dark",
        initialMode: "light",
      }),
    ).toEqual({ family: "cocoa", mode: "light" });
  });

  it("keeps a family-only initialFamily on the configured mode", () => {
    expect(
      resolveSelection({
        themes: catalog,
        defaultTheme: "oat-dark",
        initialFamily: "cocoa",
      }),
    ).toEqual({ family: "cocoa", mode: "dark" });
  });
});

describe("resolveThemeOverride — both naming forms", () => {
  const selection = { family: "oat", mode: "light" as const };

  it("accepts a variant", () => {
    expect(resolveThemeOverride(catalog, "cocoa-dark", selection)).toEqual({
      family: "cocoa",
      mode: "dark",
    });
  });

  it("accepts a family and keeps the mode in effect", () => {
    expect(resolveThemeOverride(catalog, "cocoa", selection)).toEqual({
      family: "cocoa",
      mode: "light",
    });
    expect(
      resolveThemeOverride(catalog, "cocoa", { family: "oat", mode: "dark" }),
    ).toEqual({ family: "cocoa", mode: "dark" });
  });

  it("keys a family and the equivalent object request the same", () => {
    expect(themeOverrideKey("cocoa", catalog)).toBe(
      themeOverrideKey({ family: "cocoa" }, catalog),
    );
  });

  it("returns null for an unavailable family", () => {
    expect(resolveThemeOverride(catalog, "berry", selection)).toBeNull();
  });
});

describe("runtime — naming forms end to end", () => {
  const base = {
    themes: catalog,
    dom: false as const,
    cssVariables: false as const,
    persistence: null,
    broadcast: null,
  };

  it("applies a family defaultTheme", () => {
    const runtime = createThemeRuntime({ ...base, defaultTheme: "cocoa" });
    expect(runtime.store.get().name).toBe("cocoa-light");
  });

  it("applies a family themeOverride", () => {
    const runtime = createThemeRuntime({
      ...base,
      defaultTheme: "oat-light",
      themeOverride: "cocoa",
    });
    expect(runtime.store.get().name).toBe("cocoa-light");
    expect(runtime.selection.getFamily()).toBe("cocoa");
  });

  it("applies a variant initialFamily without an unknown-family diagnostic", () => {
    const runtime = createThemeRuntime({ ...base, initialFamily: "cocoa-dark" });
    expect(runtime.selection.getSelection()).toEqual({ family: "cocoa", mode: "dark" });
    expect(runtime.store.get().name).toBe("cocoa-dark");
  });
});
