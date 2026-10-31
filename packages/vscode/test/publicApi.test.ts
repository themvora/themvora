/**
 * The API surface this extension is allowed to assume.
 *
 * Every recognition rule in discovery is anchored to one of these exports. If a
 * name is renamed or was never real — `getPresetTheme` is a good example, it does
 * not exist — the extension would silently stop finding themes. Pinning the
 * surface here turns that into a failing test.
 */

import * as core from "@themvora/core";
import { describe, expect, it } from "vitest";

describe("the shipped API surface", () => {
  it("exports every API the extension recognises", () => {
    for (const name of [
      "defineTheme",
      "generateTheme",
      "getPresetThemes",
      "getBrandPresets",
      "getBuiltInThemes",
      "createThemeRuntime",
    ]) {
      expect(typeof (core as Record<string, unknown>)[name], name).toBe("function");
    }
  });

  it("does not export the singular preset helper some plans assume", () => {
    // Recorded deliberately: a rule that looked for `getPresetTheme()` would
    // match nothing, and nobody would notice.
    expect((core as Record<string, unknown>).getPresetTheme).toBeUndefined();
  });

  it("returns a light/dark pair from the generator", () => {
    const pair = core.generateTheme({ seed: "#4f46e5" });

    expect(pair.light.meta?.mode).toBe("light");
    expect(pair.dark.meta?.mode).toBe("dark");
    // The two halves share a family; that is what makes them one family.
    expect(pair.light.meta?.family).toBe(pair.dark.meta?.family);
  });

  it("resolves presets and brands from the canonical catalog", () => {
    const presets = core.getPresetThemes();
    const brands = core.getBrandPresets();

    expect(presets.length).toBeGreaterThan(0);
    expect(brands.length).toBeGreaterThan(0);
    expect(new Set(presets.map((theme) => theme.meta?.family)).size).toBeGreaterThan(1);
  });
});
