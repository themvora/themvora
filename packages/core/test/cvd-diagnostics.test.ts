import { describe, expect, it } from "vitest";
import { defineTheme, generateTheme, scoreTheme } from "../src";
import {
  buildPalette,
  deriveIdentity,
  GENERATION_STYLE_NAMES,
  resolveStyle,
  type GenerationStyle,
} from "../src/generation";

/**
 * CVD diagnostics — the property, and the diagnostic.
 *
 * The plan asked for a generator step that increases lightness/chroma separation
 * when a CVD check flags the status roles. Before writing it, the question worth
 * asking is whether it would ever run: the status hues are fixed and far apart by
 * construction, so a repair loop might be dead code.
 *
 * These two tests answer that. The first proves the property holds across the
 * whole matrix — so no repair is needed and none is shipped. The second proves
 * the *diagnostic* still works, so if the status hues ever change the warning
 * fires instead of the property quietly failing.
 */

const SEEDS = ["#ef4444", "#f59e0b", "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#808080", "#000000"];
const MODES = ["light", "dark"] as const;

describe("CVD diagnostics", () => {
  it("never flags the status pair across the seed × style × mode matrix", () => {
    // If this ever fails, the generator needs the separation repair the plan
    // describes. Until then, shipping it would be shipping code that cannot run.
    const warnings: string[] = [];

    for (const seed of SEEDS) {
      for (const style of GENERATION_STYLE_NAMES) {
        for (const mode of MODES) {
          const theme = generateTheme({ seed, style: style as GenerationStyle })[mode];
          const cvd = scoreTheme(theme).checks.find((check) => check.id === "cvd");
          if (cvd?.status === "warn") warnings.push(`${seed}/${style}/${mode}: ${cvd.detail}`);
        }
      }
    }

    expect(warnings.slice(0, 5)).toEqual([]);
    expect(warnings).toHaveLength(0);
  });

  it("keeps the status hues far apart at the source", () => {
    // The reason no repair is needed: destructive and success are pinned to fixed
    // OKLCH hues 121° apart, independent of the seed. Nothing the seed does can
    // bring them together.
    for (const seed of SEEDS) {
      for (const mode of MODES) {
        const palette = buildPalette({
          mode,
          identity: deriveIdentity(seed),
          style: resolveStyle("balanced"),
        });
        const gap = Math.abs(palette.destructive.h - palette.success.h);
        expect(Math.min(gap, 360 - gap), `${seed}/${mode}`).toBeGreaterThan(90);
      }
    }
  });

  it("the diagnostic is live — a collapsed status pair warns", () => {
    // Proves the check is not vacuous. Take a real theme and give `success` the
    // destructive colour, so the two status roles become indistinguishable.
    const theme = generateTheme({ seed: "#3b82f6" }).light;
    const colors = { ...(theme.tokens?.colors as Record<string, string>) };
    colors.success = colors.destructive as string;
    colors.successForeground = colors.destructiveForeground as string;

    const broken = defineTheme({ name: "collapsed-status", meta: { mode: "light" }, tokens: { colors } });
    const cvd = scoreTheme(broken).checks.find((check) => check.id === "cvd");

    expect(cvd?.status).toBe("warn");
    expect(cvd?.detail).toBeTruthy();
  });

  it("reports CVD as a warning, never a failure", () => {
    // The generator cannot force a UI to also carry meaning in an icon or a
    // label, so a close pair is a diagnostic, not a conformance failure.
    for (const theme of [generateTheme({ seed: "#3b82f6" }).light, generateTheme({ seed: "#ec4899" }).dark]) {
      const cvd = scoreTheme(theme).checks.find((check) => check.id === "cvd");
      expect(cvd?.status).not.toBe("fail");
    }
  });
});
