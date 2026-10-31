/**
 * Tests for deterministic default selection.
 *
 * Verifies the selection priority:
 * 1. Persisted selection if still valid
 * 2. Strongest evidence project theme
 * 3. Any valid project theme
 * 4. Undefined (empty state)
 */
import { describe, expect, it } from "vitest";

import { generateTheme } from "@themvora/core";

import {
  buildThemeIdentifier,
  determineDefaultSelection,
} from "../src/domain/defaultSelection.js";
import type { ProjectInspection, ThemeRelationship } from "../src/domain/registry.js";

/** Build a minimal inspection for testing. */
function buildInspection(
  registries: ProjectInspection["registries"],
  relationships: readonly ThemeRelationship[] = [],
): ProjectInspection {
  return {
    root: "/test",
    status: "supported",
    packages: ["@themvora/core"],
    registries,
    notes: [],
    providers: [],
    relationships,
  };
}

describe("determineDefaultSelection", () => {
  it("returns undefined when inspection is undefined", () => {
    const result = determineDefaultSelection(undefined, undefined);
    expect(result).toBeUndefined();
  });

  it("returns undefined when no registries exist", () => {
    const inspection = buildInspection([]);
    const result = determineDefaultSelection(inspection, undefined);
    expect(result).toBeUndefined();
  });

  it("returns undefined when registries have no themes", () => {
    const inspection = buildInspection([
      {
        kind: "theme-module",
        path: "src/theme.ts",
        status: "supported",
        detail: "OK",
        themes: [],
        themeSources: [],
      },
    ]);
    const result = determineDefaultSelection(inspection, undefined);
    expect(result).toBeUndefined();
  });

  it("selects a valid project theme when no persisted selection", () => {
    const generated = generateTheme({ seed: "#0066cc" });
    const theme = generated.light;

    const inspection = buildInspection(
      [
        {
          kind: "theme-module",
          path: "src/theme.ts",
          status: "supported",
          detail: "OK",
          themes: [theme],
          themeSources: [{ name: theme.name }],
        },
      ],
      [
        {
          name: theme.name,
          definedIn: "src/theme.ts",
          usedBy: [],
          evidence: "defined-unregistered",
        },
      ],
    );

    const result = determineDefaultSelection(inspection, undefined);
    expect(result).toBeDefined();
    expect(result?.theme.name).toBe(theme.name);
    expect(result?.source).toBe("src/theme.ts");
  });

  it("prefers persisted selection when still valid", () => {
    const generated1 = generateTheme({ seed: "#0066cc" });
    const theme1 = generated1.light;

    const generated2 = generateTheme({ seed: "#cc0066" });
    const theme2 = generated2.light;

    const inspection = buildInspection(
      [
        {
          kind: "theme-module",
          path: "src/theme.ts",
          status: "supported",
          detail: "OK",
          themes: [theme1, theme2],
          themeSources: [{ name: theme1.name }, { name: theme2.name }],
        },
      ],
      [
        {
          name: theme1.name,
          definedIn: "src/theme.ts",
          usedBy: [],
          evidence: "defined-unregistered",
        },
        {
          name: theme2.name,
          definedIn: "src/theme.ts",
          usedBy: [],
          evidence: "defined-unregistered",
        },
      ],
    );

    const persisted = buildThemeIdentifier("src/theme.ts", theme2);
    const result = determineDefaultSelection(inspection, persisted);
    expect(result).toBeDefined();
    expect(result?.theme.name).toBe(theme2.name);
  });

  it("falls back to strongest evidence when persisted selection is invalid", () => {
    const generated1 = generateTheme({ seed: "#0066cc", family: "theme-one" });
    const theme1 = generated1.light;

    const generated2 = generateTheme({ seed: "#cc0066", family: "theme-two" });
    const theme2 = generated2.light;

    const inspection = buildInspection(
      [
        {
          kind: "theme-module",
          path: "src/theme.ts",
          status: "supported",
          detail: "OK",
          themes: [theme1, theme2],
          themeSources: [{ name: theme1.name }, { name: theme2.name }],
        },
      ],
      [
        {
          name: theme1.name,
          mode: "light",
          definedIn: "src/theme.ts",
          usedBy: ["src/App.tsx"],
          evidence: "registered",
        },
        {
          name: theme2.name,
          mode: "light",
          definedIn: "src/theme.ts",
          usedBy: [],
          evidence: "defined-unregistered",
        },
      ],
    );

    // Persisted selection points to a theme that no longer exists
    const persisted = {
      source: "src/theme.ts",
      name: "nonexistent-theme",
    };

    const result = determineDefaultSelection(inspection, persisted);
    expect(result).toBeDefined();
    expect(result?.theme.name).toBe(theme1.name);
    expect(result?.evidence).toBe("registered");
  });

  it("prefers registered evidence over partially-resolved", () => {
    const generated1 = generateTheme({ seed: "#0066cc", family: "theme-one" });
    const theme1 = generated1.light;

    const generated2 = generateTheme({ seed: "#cc0066", family: "theme-two" });
    const theme2 = generated2.light;

    const inspection = buildInspection(
      [
        {
          kind: "theme-module",
          path: "src/theme.ts",
          status: "supported",
          detail: "OK",
          themes: [theme1, theme2],
          themeSources: [{ name: theme1.name }, { name: theme2.name }],
        },
      ],
      [
        {
          name: theme1.name,
          mode: "light",
          definedIn: "src/theme.ts",
          usedBy: [],
          evidence: "partially-resolved",
        },
        {
          name: theme2.name,
          mode: "light",
          definedIn: "src/theme.ts",
          usedBy: ["src/App.tsx"],
          evidence: "registered",
        },
      ],
    );

    const result = determineDefaultSelection(inspection, undefined);
    expect(result).toBeDefined();
    expect(result?.theme.name).toBe(theme2.name);
    expect(result?.evidence).toBe("registered");
  });

  it("handles themes with modes correctly", () => {
    const generated = generateTheme({ seed: "#0066cc" });
    const lightTheme = generated.light;
    const darkTheme = generated.dark;

    const inspection = buildInspection(
      [
        {
          kind: "theme-module",
          path: "src/theme.ts",
          status: "supported",
          detail: "OK",
          themes: [lightTheme, darkTheme],
          themeSources: [
            { name: lightTheme.name, mode: "light" },
            { name: darkTheme.name, mode: "dark" },
          ],
        },
      ],
      [
        {
          name: lightTheme.name,
          mode: "light",
          definedIn: "src/theme.ts",
          usedBy: [],
          evidence: "defined-unregistered",
        },
        {
          name: darkTheme.name,
          mode: "dark",
          definedIn: "src/theme.ts",
          usedBy: [],
          evidence: "defined-unregistered",
        },
      ],
    );

    // Persist the dark mode
    const persisted = buildThemeIdentifier("src/theme.ts", darkTheme);
    const result = determineDefaultSelection(inspection, persisted);
    expect(result).toBeDefined();
    expect(result?.theme.name).toBe(darkTheme.name);
    expect(result?.theme.meta?.mode).toBe("dark");
  });
});

describe("buildThemeIdentifier", () => {
  it("builds an identifier from a theme without mode", () => {
    const generated = generateTheme({ seed: "#0066cc" });
    const theme = generated.light;

    const id = buildThemeIdentifier("src/theme.ts", theme);
    expect(id.source).toBe("src/theme.ts");
    expect(id.name).toBe(theme.name);
  });

  it("builds an identifier from a theme with mode", () => {
    const generated = generateTheme({ seed: "#0066cc" });
    const theme = generated.dark;

    const id = buildThemeIdentifier("src/theme.ts", theme);
    expect(id.source).toBe("src/theme.ts");
    expect(id.name).toBe(theme.name);
    expect(id.mode).toBe("dark");
  });
});
