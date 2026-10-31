/**
 * Theme file serialization.
 *
 * The payload is the thing that ends up in the user's project, so its shape is
 * asserted directly rather than through a write. The TS form matters most: it is
 * only useful if it is a file that would type-check in a Themvora project.
 */

import { generateTheme } from "@themvora/core";
import { describe, expect, it } from "vitest";

import { themeFilePayload } from "../src/services/saveTheme";

/** A real pair, so the payload contains real tokens. */
const PAIR = generateTheme({ seed: "#4f46e5" });

/** The pair as the save path takes it: an ordered set of themes. */
const THEMES = [PAIR.light, PAIR.dark];

describe("themeFilePayload", () => {
  it("writes a light/dark JSON document by default", () => {
    const text = themeFilePayload(THEMES);
    const parsed = JSON.parse(text) as { light: { name: string }; dark: { name: string } };

    expect(parsed.light.name).toBe(PAIR.light.name);
    expect(parsed.dark.name).toBe(PAIR.dark.name);
    // A trailing newline: files end with one, and a diff is cleaner for it.
    expect(text.endsWith("\n")).toBe(true);
  });

  it("writes TypeScript that imports and calls defineTheme", () => {
    const text = themeFilePayload(THEMES, "ts");

    expect(text).toContain('import { defineTheme } from "@themvora/core";');
    expect(text).toContain("export const light = defineTheme({");
    expect(text).toContain("export const dark = defineTheme({");
    expect(text).toContain("export const themes = [light, dark];");
    // The theme's own values, not a rewritten palette.
    expect(text).toContain(PAIR.light.tokens?.colors?.primary as string);
  });

  it("produces a TypeScript file whose literal is valid JSON inside the call", () => {
    // `defineTheme()` is identity, so the argument must be a real theme object.
    // Extracting it proves the call wraps the theme rather than a summary of it.
    const text = themeFilePayload(THEMES, "ts");
    const body = /export const light = defineTheme\(([\s\S]*?)\);/u.exec(text)?.[1];

    expect(body).toBeDefined();
    const parsed = JSON.parse(body!) as { name: string };
    expect(parsed.name).toBe(PAIR.light.name);
  });

  it("keeps the two formats distinct", () => {
    expect(themeFilePayload(THEMES, "json")).not.toBe(themeFilePayload(THEMES, "ts"));
  });
});

describe("themeFilePayload — the TypeScript variants", () => {
  it("re-derives a generated pair from its seed", () => {
    const text = themeFilePayload(THEMES, "ts-generate", { seed: "#4a154b", family: "slack" });

    expect(text).toContain('import { generateTheme } from "@themvora/core";');
    expect(text).toContain('export const { light, dark } = generateTheme({\n  seed: "#4a154b",\n  family: "slack",\n');
    // Nothing inlined: the file is a call, not a copy.
    expect(text).not.toContain("tokens:");
  });

  it("records every option chosen in the New theme drawer, one per line", () => {
    const text = themeFilePayload(THEMES, "ts-generate", {
      seed: "#f54260",
      family: "custom",
      style: "vibrant",
      withCode: true,
      contrast: "AA",
    });

    expect(text).toContain(
      [
        "export const { light, dark } = generateTheme({",
        '  seed: "#f54260",',
        '  family: "custom",',
        '  style: "vibrant",',
        "  withCode: true,",
        '  contrast: "AA",',
        "});",
        "",
        "export const themes = [light, dark];",
      ].join("\n"),
    );
  });

  it("states the resolved family, style and withCode when the drawer left them blank", () => {
    const text = themeFilePayload(THEMES, "ts-generate", { seed: "#4f46e5", family: "  " });

    expect(text).toContain(`  family: ${JSON.stringify(PAIR.light.meta?.family)},`);
    expect(text).toContain('  style: "balanced",');
    expect(text).toContain("  withCode: false,");
    expect(text).not.toContain("contrast:");
    expect(text).not.toContain("algorithm:");
  });

  it("calls the brand catalog for a brand preset", () => {
    // `getPresetThemes()` does not contain brand families; the wrong call here
    // produces a file whose filter matches nothing.
    const text = themeFilePayload(THEMES, "ts-preset", { presetSource: "brand", family: "slack" });

    expect(text).toContain('import { getBrandPresets } from "@themvora/core";');
    expect(text).toContain("export const presets = getBrandPresets();");
    expect(text).toContain('theme.meta?.family === "slack"');
  });

  it("calls the curated catalog for a preset, and the builtin one for builtin", () => {
    expect(themeFilePayload(THEMES, "ts-preset", { presetSource: "preset" })).toContain("getPresetThemes();");
    expect(themeFilePayload(THEMES, "ts-preset", { presetSource: "builtin" })).toContain("getBuiltInThemes();");
  });
});
