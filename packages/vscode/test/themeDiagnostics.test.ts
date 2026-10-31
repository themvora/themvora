/**
 * Diagnostic-mapping tests.
 *
 * The numbers here are the measured ones: a theme with two colours and a
 * non-colour `primary` produces 19 issues from `validateTheme` and 20 from
 * `validateThemeLevels`, overlapping on 19 paths. If the mapping ever stops
 * deduplicating, these counts move and the suite says so.
 */
import { generateTheme, validateTheme, type ThemeDefinition } from "@themvora/core";
import { describe, expect, it } from "vitest";

import { diagnoseThemes, severityOfLevel } from "../src/domain/themeDiagnostics";

const BASE = generateTheme({ seed: "#4f46e5" }).light;
const DARK = generateTheme({ seed: "#4f46e5" }).dark;

/** A theme missing 19 roles and carrying one unusable value. */
const BROKEN: ThemeDefinition = {
  name: "broken",
  tokens: { colors: { primary: "not-a-color", background: "#ffffff" } },
};

describe("structural errors", () => {
  it("reports one error per missing token path", () => {
    const issues = diagnoseThemes([BROKEN]);
    const missing = issues.filter((issue) => issue.code === "TV_THEME_TOKEN_MISSING");

    expect(missing).toHaveLength(19);
    expect(missing.every((issue) => issue.severity === "error")).toBe(true);
    // Every one names a path, and no path repeats.
    expect(new Set(missing.map((issue) => issue.path)).size).toBe(19);
  });

  it("keeps the invalid-value finding that validateTheme does not report", () => {
    const issues = diagnoseThemes([BROKEN]);
    const invalid = issues.filter((issue) => issue.code === "TV_THEME_TOKEN_INVALID");

    expect(invalid).toHaveLength(1);
    expect(invalid[0]?.path).toBe("colors.primary");
    expect(invalid[0]?.severity).toBe("error");
  });

  it("does not duplicate the 19 paths both sources report", () => {
    const issues = diagnoseThemes([BROKEN]);

    // 19 missing + 1 invalid. The 19 duplicated level issues are gone.
    expect(issues).toHaveLength(20);

    const keys = issues.map((issue) => `${issue.code}|${issue.path ?? ""}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("reports a fully broken theme without inventing mode issues", () => {
    // Core emits no `TV_MODE_INVALID` for a theme definition — only for the
    // runtime `setMode` API — so the adapter must not fabricate one.
    const invalidMode = { name: "x", meta: { mode: "purple" }, tokens: {} } as unknown as ThemeDefinition;
    const issues = diagnoseThemes([invalidMode]);

    expect(issues.every((issue) => issue.code !== "TV_MODE_INVALID")).toBe(true);
    expect(issues.length).toBeGreaterThan(0);
  });
});

describe("quality warnings", () => {
  /** A valid theme whose primary pair fails contrast. */
  const lowContrast: ThemeDefinition = {
    ...BASE,
    tokens: {
      ...BASE.tokens!,
      colors: { ...BASE.tokens!.colors!, primaryForeground: BASE.tokens!.colors!["primary"] },
    },
  };

  it("is a warning, and core still calls the theme valid", () => {
    const issues = diagnoseThemes([lowContrast]);
    const contrast = issues.filter((issue) => issue.code === "TV_A11Y_CONTRAST_VIOLATION");

    expect(contrast).toHaveLength(1);
    expect(contrast[0]?.severity).toBe("warning");

    // The severity split has to follow core: it says valid, so this cannot be an
    // error without the extension contradicting the CLI.
    expect(validateTheme(lowContrast).valid).toBe(true);
    expect(issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
  });

  it("maps every non-structural level to a warning", () => {
    expect(severityOfLevel("structural")).toBe("error");
    for (const level of ["semantic", "contrast", "visual", "accessibility"] as const) {
      expect(severityOfLevel(level)).toBe("warning");
    }
  });

  it("reports nothing for a healthy theme", () => {
    expect(diagnoseThemes([BASE])).toEqual([]);
  });
});

describe("theme halves", () => {
  it("labels a single theme", () => {
    const issues = diagnoseThemes([BROKEN]);

    expect(issues.every((issue) => issue.half === "single")).toBe(true);
  });

  it("labels a pair light and dark", () => {
    const issues = diagnoseThemes([BROKEN, { name: "dark-broken", tokens: {} } as ThemeDefinition]);

    expect(issues.some((issue) => issue.half === "light")).toBe(true);
    expect(issues.some((issue) => issue.half === "dark")).toBe(true);
  });

  it("does not collapse the same path across both halves", () => {
    // Both halves are missing `colors.primary`; those are two different places in
    // the document and must stay two diagnostics.
    const light: ThemeDefinition = { name: "l", meta: { mode: "light" }, tokens: {} };
    const dark: ThemeDefinition = { name: "d", meta: { mode: "dark" }, tokens: {} };

    const issues = diagnoseThemes([light, dark]);
    const primary = issues.filter((issue) => issue.path === "colors.primary");

    expect(primary).toHaveLength(2);
    expect(new Set(primary.map((issue) => issue.half))).toEqual(new Set(["light", "dark"]));
  });

  it("reports a healthy pair as clean", () => {
    expect(diagnoseThemes([BASE, DARK])).toEqual([]);
  });
});
