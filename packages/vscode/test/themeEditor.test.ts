/**
 * The schema-derived editor model.
 *
 * These tests use a real generated pair plus the non-colour groups documented
 * for `ThemeTokens`; no fixture invents a token shape.
 */
import { generateTheme, type ThemeDefinition } from "@themvora/core";
import { describe, expect, it } from "vitest";

import {
  buildThemeEditor,
  editThemeToken,
  flattenThemeTokens,
  pathKey,
  tokenValueAt,
} from "../src/domain/themeEditor";

const PAIR = generateTheme({ seed: "#0ea5e9", family: "ocean" });

/**
 * Add one of every non-colour group and optional/additional colours.
 *
 * @param theme - A generated theme.
 * @returns A theme with the full shipped token surface.
 */
function rich(theme: ThemeDefinition): ThemeDefinition {
  return {
    ...theme,
    tokens: {
      ...theme.tokens,
      colors: {
        ...theme.tokens?.colors,
        warning: "#f59e0b",
        warningForeground: "#111111",
        brand: { primary: "#123456", accent: "#654321" },
      },
      spacing: { md: "12px", lg: "24px" },
      radius: { lg: "8px" },
      shadows: { card: "0 1px 2px #0002" },
      borderWidths: { thin: "1px" },
      zIndex: { modal: "1000" },
      breakpoints: { md: "768px" },
      typography: {
        fontFamilies: { sans: "Inter, sans-serif" },
        fontSizes: { sm: "0.875rem" },
        lineHeights: { normal: "1.5" },
      },
      code: { comment: "#6b7280", keyword: "#7c3aed" },
    },
  };
}

function family(): { readonly light: ThemeDefinition; readonly dark: ThemeDefinition } {
  return { light: rich(PAIR.light), dark: rich(PAIR.dark) };
}

/**
 * Find one token by its path.
 *
 * @param editor - The editor groups.
 * @param path - The path.
 * @returns The token, or undefined.
 */
function token(editor: ReturnType<typeof buildThemeEditor>["editor"], path: string[]) {
  return editor.groups.flatMap((group) => group.tokens).find((entry) => pathKey(entry.path) === pathKey(path));
}

describe("flattenThemeTokens", () => {
  it("keeps nested colour paths and every string group", () => {
    const flat = flattenThemeTokens(family().light.tokens);
    const keys = new Set(flat.map((entry) => pathKey(entry.path)));
    expect(keys.has(pathKey(["colors", "brand", "primary"]))).toBe(true);
    expect(keys.has(pathKey(["radius", "lg"]))).toBe(true);
    expect(keys.has(pathKey(["typography", "fontSizes", "sm"]))).toBe(true);
    expect(keys.has(pathKey(["code", "comment"]))).toBe(true);
  });

  it("reads a value through a nested path", () => {
    expect(tokenValueAt(family().light.tokens, ["colors", "brand", "primary"])).toBe("#123456");
    expect(tokenValueAt(family().light.tokens, ["colors", "missing"])).toBeUndefined();
  });
});

describe("buildThemeEditor", () => {
  it("uses the shipped semantic groups and the real non-colour groups", () => {
    const { light, dark } = family();
    const { editor } = buildThemeEditor({
      theme: light,
      family: [light, dark],
      baseline: [light, dark],
      editable: true,
    });

    expect(editor.groups.map((group) => group.id)).toEqual(
      expect.arrayContaining([
        "canvas",
        "surfaces",
        "actions",
        "states",
        "interaction",
        "additional-colors",
        "code",
        "spacing",
        "radius",
        "shadows",
        "borderWidths",
        "zIndex",
        "breakpoints",
        "typography",
      ]),
    );

    const warning = token(editor, ["colors", "warning"]);
    expect(warning).toMatchObject({ group: "states", optional: true, type: "color" });

    expect(token(editor, ["colors", "brand", "primary"])).toMatchObject({
      group: "additional-colors",
      optional: true,
      type: "color",
    });
    expect(token(editor, ["radius", "lg"])).toMatchObject({ type: "length" });
    expect(token(editor, ["zIndex", "modal"])).toMatchObject({ type: "number" });
    expect(token(editor, ["code", "comment"])).toMatchObject({ type: "color", group: "code" });
    expect(token(editor, ["typography", "fontSizes", "sm"])).toMatchObject({
      type: "font-size",
      group: "typography",
    });
  });

  it("reads contrast and core's actual CSS custom property name", () => {
    const { light, dark } = family();
    const { editor } = buildThemeEditor({
      theme: light,
      family: [light, dark],
      baseline: [light, dark],
      editable: true,
    });

    const primaryForeground = token(editor, ["colors", "primaryForeground"]);
    expect(primaryForeground?.contrasts[0]).toMatchObject({
      against: "primary",
      requirement: "text",
    });
    expect(primaryForeground?.cssVar).toBe("--theme-color-primaryForeground");
    expect(token(editor, ["colors", "border"])?.contrasts).toEqual([]);
  });

  it("marks only the edited variant and counts the changed value", () => {
    const { light, dark } = family();
    const edited = editThemeToken(light, ["colors", "primary"], "#112233");
    expect(edited).toBeDefined();
    const current = [edited!, dark];
    const { editor } = buildThemeEditor({
      theme: edited!,
      family: current,
      baseline: [light, dark],
      editable: true,
    });

    expect(token(editor, ["colors", "primary"])).toMatchObject({
      value: "#112233",
      original: light.tokens?.colors?.primary,
      changed: true,
    });
    expect(editor.customized).toBe(true);
    expect(editor.changedTokens).toBe(1);
    expect(dark.tokens?.colors?.primary).toBe(PAIR.dark.tokens?.colors?.primary);
  });

  it("reports a light-only token when the dark variant does not define it", () => {
    const { light, dark } = family();
    const lightOnly: ThemeDefinition = {
      ...light,
      tokens: { ...light.tokens, colors: { ...light.tokens?.colors, lightOnly: "#abcdef" } },
    };
    const current = [lightOnly, dark];
    const { editor } = buildThemeEditor({
      theme: lightOnly,
      family: current,
      baseline: current,
      editable: true,
    });

    expect(token(editor, ["colors", "lightOnly"])).toMatchObject({
      presentIn: ["light"],
      presentInSelected: true,
    });

    const darkEditor = buildThemeEditor({
      theme: dark,
      family: current,
      baseline: current,
      editable: true,
    }).editor;
    expect(token(darkEditor, ["colors", "lightOnly"])).toMatchObject({
      presentIn: ["light"],
      presentInSelected: false,
    });
  });

  it("does not mark read-only project themes as changed", () => {
    const { light, dark } = family();
    const { editor } = buildThemeEditor({
      theme: light,
      family: [light, dark],
      editable: false,
    });
    expect(editor.customized).toBe(false);
    expect(editor.changedTokens).toBe(0);
    expect(editor.groups.flatMap((group) => group.tokens).every((entry) => !entry.changed)).toBe(true);
  });
});

describe("editThemeToken", () => {
  it("writes a nested value without losing its siblings", () => {
    const { light } = family();
    const edited = editThemeToken(light, ["colors", "brand", "primary"], "#abcdef");
    expect(edited).toBeDefined();
    const colors = edited?.tokens?.colors as Record<string, unknown>;
    expect(colors.brand).toMatchObject({ primary: "#abcdef", accent: "#654321" });
    // The original object is untouched.
    const original = light.tokens?.colors as Record<string, unknown>;
    expect(original.brand).toMatchObject({ primary: "#123456" });
  });

  it("refuses a missing path instead of adding a token", () => {
    const { light } = family();
    expect(editThemeToken(light, ["colors", "notThere"], "#fff")).toBeUndefined();
    expect(editThemeToken(light, ["notAGroup", "x"], "#fff")).toBeUndefined();
  });
});
