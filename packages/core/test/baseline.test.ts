import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateTheme,
  getBrandPresets,
  getBuiltInThemes,
  getContrastRatio,
  getPresetThemes,
  type ThemeDefinition,
} from "../src";
/**
 * Phase 0 baseline (theme-generation.md).
 *
 * Captures the **pre-semantic-v2** generator output so that every later change to
 * the algorithm is a deliberate, reviewable diff rather than a silent drift.
 *
 * Run `TV_CAPTURE_BASELINE=1 vitest run test/baseline.test.ts` to (re)capture.
 * Otherwise the test asserts the current generator still reproduces the fixture.
 *
 * When the generator is intentionally upgraded (Phase 3+), re-capture and explain
 * the diff in the Agent Log of `theme-generation.md` — never edit the fixture by
 * hand to make this pass.
 */

const BASELINE_DIR = join(import.meta.dirname, "__baseline__");

/**
 * The **active** snapshot, asserted on every run. Captured from the
 * `semantic-v2` generator.
 */
const BASELINE_FILE = join(BASELINE_DIR, "theme-generation.semantic-v2.json");

/**
 * The frozen Phase 0 capture of the pre-`semantic-v2` (HSL) generator.
 *
 * Kept as the record of what changed — it is deliberately **not** asserted,
 * because the change to `semantic-v2` was intentional. Its failing pairs are the
 * ones Phase 3 had to fix.
 */
const PRE_V2_FILE = join(BASELINE_DIR, "theme-generation.baseline.json");

/** Hues across the wheel plus the awkward cases: pastel, dark, light, near-neutral,
 *  high-saturation, warm and cool. 37 seeds, deterministic order. */
const SEED_MATRIX: readonly string[] = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#000000", "#ffffff", "#808080",
  "#a1a1aa", "#7f8c8d", "#f5f5f5", "#0a0a0a", "#fde68a",
  "#bbf7d0", "#bfdbfe", "#e9d5ff", "#ff0000", "#00ff00",
  "#0000ff", "#00ffff", "#ff00ff", "#ffff00", "#78350f",
  "#1e3a8a", "#831843",
];

/** The nine curated default presets (the `neutral` family is the runtime baseline,
 *  not a preset). */
const DEFAULT_FAMILIES = [
  "oat", "berry", "mint", "citrus", "cocoa", "plum", "iris", "sky", "graphite",
] as const;

const BRAND_FAMILIES = ["apple", "github", "vercel", "slack", "discord"] as const;

/** Every pair the semantic system promises to keep readable. */
const READABLE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["foreground", "background"],
  ["cardForeground", "card"],
  ["popoverForeground", "popover"],
  ["primaryForeground", "primary"],
  ["secondaryForeground", "secondary"],
  ["accentForeground", "accent"],
  ["mutedForeground", "muted"],
  ["destructiveForeground", "destructive"],
  ["successForeground", "success"],
  ["warningForeground", "warning"],
];

function colorsOf(theme: ThemeDefinition): Record<string, string> {
  return (theme.tokens?.colors ?? {}) as Record<string, string>;
}

function snapshotTheme(theme: ThemeDefinition) {
  return {
    name: theme.name,
    family: theme.meta?.family ?? null,
    mode: theme.meta?.mode ?? null,
    colors: colorsOf(theme),
  };
}

function buildBaseline() {
  const seedMatrix = SEED_MATRIX.map((seed) => {
    const { light, dark } = generateTheme({ seed });
    return { seed, light: colorsOf(light), dark: colorsOf(dark) };
  });

  const defaultPresets = getPresetThemes().map(snapshotTheme);
  const brandPresets = getBrandPresets().map(snapshotTheme);

  // The shipped set: the raw sources with `ensureReadableContrast` applied. The
  // preset audit compares against *these*, because they are what a consumer
  // actually receives — comparing shipped output to raw sources would report
  // "drift" that no consumer can see.
  const shippedThemes = getBuiltInThemes().map(snapshotTheme);

  // Contrast report for every built-in theme, including the pairs that fail.
  const contrast = getBuiltInThemes().map((theme) => {
    const colors = colorsOf(theme);
    const checks = READABLE_PAIRS.flatMap(([fgKey, bgKey]) => {
      const fg = colors[fgKey];
      const bg = colors[bgKey];
      if (typeof fg !== "string" || typeof bg !== "string") return [];
      const ratio = getContrastRatio(fg, bg);
      return [{
        pair: `${fgKey}/${bgKey}`,
        ratio: Math.round(ratio * 1000) / 1000,
        passesAA: ratio >= 4.5,
      }];
    });
    return { name: theme.name, checks };
  });

  // Preset override API: overrides are applied after generation and never repaired.
  const overridden = getPresetThemes({
    plum: { light: { tokens: { colors: { primary: "#6d28d9" } } } },
  }).find((t) => t.name === "plum-light");

  const presetOverride = {
    primary: overridden ? colorsOf(overridden).primary : null,
  };

  return {
    note: "Pre-semantic-v2 generator baseline. See theme-generation.md Phase 0.",
    seedMatrix,
    defaultPresets,
    brandPresets,
    shippedThemes,
    contrast,
    presetOverride,
  };
}

describe("Phase 0 baseline", () => {
  it("reproduces the committed baseline fixtures", () => {
    const current = buildBaseline();

    if (process.env.TV_CAPTURE_BASELINE === "1") {
      mkdirSync(BASELINE_DIR, { recursive: true });
      writeFileSync(BASELINE_FILE, `${JSON.stringify(current, null, 2)}\n`, "utf8");
      return;
    }

    expect(existsSync(BASELINE_FILE), `missing ${BASELINE_FILE} — run with TV_CAPTURE_BASELINE=1`).toBe(true);
    const saved = JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
    expect(current).toEqual(saved);
  });

  it("covers the required preset families and a wide seed matrix", () => {
    const current = buildBaseline();

    const defaultFamilies = new Set(current.defaultPresets.map((t) => t.family));
    for (const family of DEFAULT_FAMILIES) {
      expect(defaultFamilies.has(family), `missing default preset ${family}`).toBe(true);
    }

    const brandFamilies = new Set(current.brandPresets.map((t) => t.family));
    for (const family of BRAND_FAMILIES) {
      expect(brandFamilies.has(family), `missing brand preset ${family}`).toBe(true);
    }

    expect(current.seedMatrix.length).toBeGreaterThanOrEqual(30);
    // Every default preset ships both modes.
    for (const family of DEFAULT_FAMILIES) {
      const modes = current.defaultPresets.filter((t) => t.family === family).map((t) => t.mode);
      expect(modes.sort()).toEqual(["dark", "light"]);
    }
  });

  it("records the Phase 0 known contrast failures as fixed regression cases", () => {
    // The pre-`semantic-v2` capture is the evidence: it contains the failures the
    // plan lists. The active capture must contain none of them.
    expect(existsSync(PRE_V2_FILE), "the Phase 0 pre-v2 capture must be preserved").toBe(true);

    interface SeedEntry {
      seed: string;
      light: Record<string, string>;
      dark: Record<string, string>;
    }

    const failingIn = (snapshot: { seedMatrix: SeedEntry[] }): string[] => {
      const failures: string[] = [];
      for (const entry of snapshot.seedMatrix) {
        for (const mode of ["light", "dark"] as const) {
          const colors = entry[mode];
          for (const [fgKey, bgKey] of READABLE_PAIRS) {
            const fg = colors[fgKey];
            const bg = colors[bgKey];
            if (typeof fg !== "string" || typeof bg !== "string") continue;
            if (getContrastRatio(fg, bg) < 4.5) failures.push(`${entry.seed} ${mode} ${fgKey}/${bgKey}`);
          }
        }
      }
      return failures;
    };

    const before = failingIn(JSON.parse(readFileSync(PRE_V2_FILE, "utf8")));
    const after = failingIn(JSON.parse(readFileSync(BASELINE_FILE, "utf8")));

    // The pre-v2 generator failed on the generated seed matrix; the semantic-v2
    // one does not. If the second assertion ever breaks, a later change
    // reintroduced a failure rather than fixing one.
    expect(before.length).toBeGreaterThan(0);
    expect(after).toEqual([]);
  });
});
