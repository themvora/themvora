import { describe, expect, it } from "vitest";
import { CORE_COLORS } from "../src";
import { contrastRatio, hueDistance, oklchToRgb } from "../src/color";
import {
  buildPalette,
  DEFAULT_RELATIONSHIP_THRESHOLDS,
  deriveIdentity,
  FOCUS_SURFACES,
  GENERATION_STYLES,
  resolveStyle,
  SEMANTIC_PAIRS,
  solvePalette,
  STATUS_HUES,
  targetFor,
  type GenerationStyle,
  type Palette,
  type PaletteContext,
} from "../src/generation";

const SEED_MATRIX = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#000000", "#ffffff", "#808080",
  "#a1a1aa", "#7f8c8d", "#fde68a", "#bbf7d0", "#bfdbfe",
  "#e9d5ff", "#ff0000", "#00ff00", "#0000ff", "#78350f",
  "#1e3a8a", "#831843", "#6d28d9",
];

const STYLES: GenerationStyle[] = ["balanced", "soft", "vibrant", "editorial", "minimal", "brand"];
const MODES = ["light", "dark"] as const;

function context(seed: string, mode: "light" | "dark", style: GenerationStyle): PaletteContext {
  return { mode, identity: deriveIdentity(seed), style: resolveStyle(style) };
}

function solved(seed: string, mode: "light" | "dark", style: GenerationStyle = "balanced") {
  const ctx = context(seed, mode, style);
  return { ctx, result: solvePalette(buildPalette(ctx), ctx) };
}

function ratioOf(palette: Palette, fg: keyof Palette, bg: keyof Palette): number {
  return contrastRatio(oklchToRgb(palette[fg]), oklchToRgb(palette[bg]));
}

describe("solver — contract", () => {
  it("every pair meets its target, with margin, across seeds × styles × modes", () => {
    const failures: string[] = [];

    for (const seed of SEED_MATRIX) {
      for (const style of STYLES) {
        for (const mode of MODES) {
          const { result } = solved(seed, mode, style);
          for (const pair of SEMANTIC_PAIRS) {
            const target = targetFor(pair.requirement);
            const ratio = ratioOf(result.palette, pair.foreground, pair.background);
            if (ratio < target) {
              failures.push(
                `${seed}/${style}/${mode} ${pair.foreground}/${pair.background} ${ratio.toFixed(3)} < ${target}`,
              );
            }
          }
        }
      }
    }

    expect(failures.slice(0, 12)).toEqual([]);
    expect(failures).toHaveLength(0);
  });

  it("reports no unsatisfied constraints across the matrix", () => {
    for (const seed of SEED_MATRIX) {
      for (const style of STYLES) {
        for (const mode of MODES) {
          const { result } = solved(seed, mode, style);
          expect(result.unsatisfied, `${seed}/${style}/${mode}`).toEqual([]);
        }
      }
    }
  });

  it("emits every core role after solving", () => {
    const { result } = solved("#3b82f6", "light");
    for (const role of CORE_COLORS) expect(result.palette[role]).toBeDefined();
  });
});

describe("solver — Phase 0 known-failure regressions", () => {
  it("fixes the mutedForeground/muted pair", () => {
    // Captured in the baseline as failing in the brand presets (2.48:1).
    const { result } = solved("#5865f2", "light");
    expect(ratioOf(result.palette, "mutedForeground", "muted")).toBeGreaterThanOrEqual(4.75);
  });

  it("fixes the destructiveForeground/destructive pair", () => {
    const { result } = solved("#0071e3", "light");
    expect(ratioOf(result.palette, "destructiveForeground", "destructive")).toBeGreaterThanOrEqual(4.75);
  });

  it("fixes the successForeground/success pair that failed in 17 themes at 3.30:1", () => {
    const { result } = solved("#16a34a", "light");
    expect(ratioOf(result.palette, "successForeground", "success")).toBeGreaterThanOrEqual(4.75);
  });

  it("fixes the primaryForeground/primary pair that failed for #3b82f6 at 3.32:1", () => {
    const { result } = solved("#3b82f6", "light");
    expect(ratioOf(result.palette, "primaryForeground", "primary")).toBeGreaterThanOrEqual(4.75);
  });
});

describe("solver — behaviour", () => {
  it("preserves the primary hue within tolerance while repairing", () => {
    const identity = deriveIdentity("#6d28d9");
    const { result } = solved("#6d28d9", "light");
    expect(hueDistance(result.palette.primary.h, identity.hue)).toBeLessThan(2);
    // And the pair it was repaired for is now satisfied.
    expect(ratioOf(result.palette, "primaryForeground", "primary")).toBeGreaterThanOrEqual(4.75);
  });

  it("never changes the hue family of the status colours", () => {
    for (const seed of SEED_MATRIX) {
      for (const mode of MODES) {
        const { result } = solved(seed, mode);
        expect(hueDistance(result.palette.destructive.h, STATUS_HUES.destructive), seed).toBeLessThan(2);
        expect(hueDistance(result.palette.success.h, STATUS_HUES.success), seed).toBeLessThan(2);
      }
    }
  });

  it("is idempotent — solving a solved palette changes nothing", () => {
    for (const seed of ["#3b82f6", "#6d28d9", "#16a34a", "#000000"]) {
      for (const mode of MODES) {
        const { ctx, result } = solved(seed, mode);
        const again = solvePalette(result.palette, ctx);
        expect(again.palette, `${seed}/${mode}`).toEqual(result.palette);
        expect(again.adjustments, `${seed}/${mode}`).toEqual([]);
      }
    }
  });

  it("leaves an already-valid palette untouched", () => {
    // A palette solved once is valid; the second solve must be a no-op.
    const ctx = context("#0ea5e9", "dark");
    const first = solvePalette(buildPalette(ctx), ctx);
    const second = solvePalette(first.palette, ctx);
    expect(second.adjustments).toHaveLength(0);
    expect(second.palette).toEqual(first.palette);
  });

  it("records repairs with before/after and a reason", () => {
    const { result } = solved("#3b82f6", "light");
    expect(result.adjustments.length).toBeGreaterThan(0);
    for (const adjustment of result.adjustments) {
      expect(CORE_COLORS).toContain(adjustment.role);
      expect(adjustment.after).toBeGreaterThanOrEqual(adjustment.before);
      expect(["foreground-lightness", "surface-lightness", "hierarchy"]).toContain(adjustment.reason);
    }
  });

  it("keeps the content hierarchy after repair", () => {
    for (const seed of SEED_MATRIX) {
      for (const mode of MODES) {
        const { result } = solved(seed, mode);
        const { foreground, secondaryForeground, mutedForeground } = result.palette;
        const isLight = mode === "light";
        const strength = (l: number) => (isLight ? -l : l);
        expect(strength(foreground.l), seed).toBeGreaterThanOrEqual(strength(secondaryForeground.l) - 1e-9);
        expect(strength(secondaryForeground.l), seed).toBeGreaterThanOrEqual(strength(mutedForeground.l) - 1e-9);
      }
    }
  });

  it("is deterministic", () => {
    const a = solved("#8b5cf6", "dark", "vibrant").result;
    const b = solved("#8b5cf6", "dark", "vibrant").result;
    expect(a).toEqual(b);
  });
});

describe("solver — UI pairs", () => {
  it("holds input and ring to the UI target against every surface they sit on", () => {
    for (const mode of MODES) {
      const { result } = solved("#3b82f6", mode);

      for (const surface of FOCUS_SURFACES) {
        expect(ratioOf(result.palette, "ring", surface), `ring/${surface}/${mode}`).toBeGreaterThanOrEqual(3.2);
      }
      for (const surface of ["background", "card"] as const) {
        expect(ratioOf(result.palette, "input", surface), `input/${surface}/${mode}`).toBeGreaterThanOrEqual(3.2);
      }
    }
  });

  it("keeps border out of the contrast contract — it is a band, not a threshold", () => {
    // Phase 7.3: holding a decorative border to 3:1 turns a hairline into
    // charcoal. It is constrained to a band instead, and the band is wide.
    for (const mode of MODES) {
      const { result } = solved("#3b82f6", mode);
      const delta = Math.abs(result.palette.border.l - result.palette.background.l);

      expect(delta, mode).toBeGreaterThanOrEqual(DEFAULT_RELATIONSHIP_THRESHOLDS.borderVisibility - 1e-6);
      expect(delta, mode).toBeLessThanOrEqual(DEFAULT_RELATIONSHIP_THRESHOLDS.borderDominance + 1e-6);
      // And it is emphatically not required to clear 3:1.
      expect(ratioOf(result.palette, "border", "background")).toBeLessThan(3.2);
    }
  });
});
