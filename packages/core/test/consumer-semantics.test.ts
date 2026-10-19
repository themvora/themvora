import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateTheme,
  getBrandPresets,
  getContrastRatio,
  getPresetThemes,
  themeToCSSVariables,
  type ThemeDefinition,
} from "../src";

/**
 * Phase 5 — the consumer contract.
 *
 * Verifies that the path a real UI actually paints goes from the semantic token
 * → CSS custom property → Tailwind utility, and that the *painted* foreground /
 * background pairs meet the WCAG AA floor. This is where "the generator produced
 * a readable token" becomes "the primary button is readable".
 */

/** The 21 core semantic roles, in the same spelling the API uses. */
const ROLES = [
  "background",
  "foreground",
  "card",
  "cardForeground",
  "popover",
  "popoverForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "muted",
  "mutedForeground",
  "accent",
  "accentForeground",
  "destructive",
  "destructiveForeground",
  "success",
  "successForeground",
  "border",
  "input",
  "ring",
] as const;

/** The pairs a real consumer paints: [foreground token, background token]. */
const PAINTED_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["foreground", "background"],
  ["cardForeground", "card"],
  ["popoverForeground", "popover"],
  ["primaryForeground", "primary"], // primary button
  ["secondaryForeground", "secondary"], // secondary button
  ["accentForeground", "accent"], // accent surface
  ["mutedForeground", "muted"],
  ["destructiveForeground", "destructive"],
  ["successForeground", "success"],
  ["mutedForeground", "background"], // muted supporting text on the page
  ["mutedForeground", "card"], // muted supporting text on a card
];

const AA_NORMAL_TEXT = 4.5;

const GENERATED_LIGHT_DARK = [
  generateTheme({ seed: "#635BFF", family: "brand" }).light,
  generateTheme({ seed: "#635BFF", family: "brand" }).dark,
];

const PRESETS = [...getPresetThemes(), ...getBrandPresets()];

const ALL: ReadonlyArray<readonly [string, ThemeDefinition]> = [
  ...GENERATED_LIGHT_DARK.map((t) => [`generated ${t.name}`, t] as const),
  ...PRESETS.map((t) => [`preset ${t.name}`, t] as const),
];

describe("consumer contract — CSS variables resolve to the semantic tokens", () => {
  it.each(ALL)("%s: every role maps to --theme-color-<role>", (_label, theme) => {
    const vars = themeToCSSVariables(theme);
    const colors = (theme.tokens?.colors ?? {}) as Record<string, string>;

    for (const role of ROLES) {
      expect(vars[`--theme-color-${role}`], `${theme.name} ${role}`).toBe(colors[role]);
    }
  });
});

describe("consumer contract — Tailwind utilities bind to the token variables", () => {
  // The utilitarian layer must not invent its own values: each Tailwind semantic
  // utility must resolve to the `--theme-color-*` variable the runtime writes.
  const themeCss = readFileSync(
    join(import.meta.dirname, "..", "..", "tailwind", "src", "theme.css"),
    "utf8",
  );

  const UTILITIES: ReadonlyArray<readonly [string, string]> = [
    ["primary", "primary"],
    ["primary-foreground", "primaryForeground"],
    ["secondary-foreground", "secondaryForeground"],
    ["muted-foreground", "mutedForeground"],
    ["accent-foreground", "accentForeground"],
    ["destructive-foreground", "destructiveForeground"],
    ["success-foreground", "successForeground"],
    ["foreground", "foreground"],
    ["card-foreground", "cardForeground"],
    ["popover-foreground", "popoverForeground"],
    ["background", "background"],
    ["card", "card"],
    ["popover", "popover"],
    ["border", "border"],
    ["input", "input"],
    ["ring", "ring"],
  ];

  it.each(UTILITIES)("--color-%s resolves to the %s token", (utility, role) => {
    // Accept either the kebab or the camelCase variable name as the last fallback.
    expect(themeCss).toContain(`--color-${utility}: var(--theme-color-${utility}`);
    const tailwindVar = `--color-${utility}`;
    const line = themeCss.split("\n").find((l) => l.trimStart().startsWith(tailwindVar));
    expect(line, `${tailwindVar} must be declared`).toBeTruthy();
    expect(line!).toMatch(new RegExp(`--theme-color-${role}\\b`));
  });
});

describe("consumer contract — painted pairs meet WCAG AA", () => {
  it.each(ALL)("%s: every painted pair is >= 4.5:1", (label, theme) => {
    const colors = (theme.tokens?.colors ?? {}) as Record<string, string>;

    for (const [fgKey, bgKey] of PAINTED_PAIRS) {
      const fg = colors[fgKey];
      const bg = colors[bgKey];
      const ratio = getContrastRatio(fg, bg);
      expect(
        ratio,
        `${label} ${fgKey}/${bgKey} = ${ratio.toFixed(2)}:1 (fg=${fg} bg=${bg})`,
      ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    }
  });
});
