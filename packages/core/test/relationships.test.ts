import { describe, expect, it } from "vitest";
import { withLightness } from "../src/color";
import {
  buildPalette,
  checkRelationships,
  DEFAULT_RELATIONSHIP_THRESHOLDS,
  deriveIdentity,
  enforceRelationships,
  generateRolePalette,
  GENERATION_STYLES,
  resolveStyle,
  type GenerationStyle,
  type Palette,
  type PaletteContext,
} from "../src/generation";

const SEEDS = ["#3b82f6", "#d97706", "#22c55e", "#7c3aed", "#ef4444", "#808080", "#000000", "#ffffff", "#f59e0b", "#0ea5e9"];
const STYLES: GenerationStyle[] = ["balanced", "soft", "vibrant", "editorial", "minimal", "brand"];
const MODES = ["light", "dark"] as const;

function context(seed: string, mode: "light" | "dark", style: GenerationStyle): PaletteContext {
  return { mode, identity: deriveIdentity(seed), style: resolveStyle(style) };
}

describe("relationships — the full pipeline holds together", () => {
  it("reports no relationship issues across seeds × styles × modes", () => {
    const failures: string[] = [];
    for (const seed of SEEDS) {
      for (const style of STYLES) {
        for (const mode of MODES) {
          const result = generateRolePalette(context(seed, mode, style));
          for (const issue of result.relationshipIssues) {
            failures.push(`${seed}/${style}/${mode} ${issue.check} ${issue.value.toFixed(3)} < ${issue.threshold}`);
          }
        }
      }
    }
    expect(failures.slice(0, 12)).toEqual([]);
    expect(failures).toHaveLength(0);
  });

  it("produces no unsatisfied contrast constraints either", () => {
    for (const seed of SEEDS) {
      for (const mode of MODES) {
        const result = generateRolePalette(context(seed, mode, "balanced"));
        expect(result.unsatisfied, `${seed}/${mode}`).toEqual([]);
      }
    }
  });
});

describe("relationships — individual checks", () => {
  it("separates background, card and popover", () => {
    for (const mode of MODES) {
      const { palette } = generateRolePalette(context("#3b82f6", mode, "balanced"));
      expect(Math.abs(palette.card.l - palette.background.l)).toBeGreaterThanOrEqual(
        DEFAULT_RELATIONSHIP_THRESHOLDS.backgroundCard,
      );
      expect(Math.abs(palette.popover.l - palette.card.l)).toBeGreaterThanOrEqual(
        DEFAULT_RELATIONSHIP_THRESHOLDS.cardPopover,
      );
    }
  });

  it("keeps the border visible without dominating", () => {
    for (const mode of MODES) {
      const { palette } = generateRolePalette(context("#3b82f6", mode, "balanced"));
      const delta = Math.abs(palette.border.l - palette.background.l);
      expect(delta).toBeGreaterThanOrEqual(DEFAULT_RELATIONSHIP_THRESHOLDS.borderVisibility);
      expect(delta).toBeLessThanOrEqual(DEFAULT_RELATIONSHIP_THRESHOLDS.borderDominance);
    }
  });

  it("keeps primary apart from background, secondary and accent", () => {
    for (const seed of SEEDS) {
      const { palette } = generateRolePalette(context(seed, "light", "balanced"));
      const { primary, accent } = palette;
      // Accent is the collision the plan names explicitly.
      expect(Math.abs(primary.h - accent.h)).toBeGreaterThan(1);
      expect(checkRelationships(palette, context(seed, "light", "balanced")).some((i) => i.check === "primary-separation")).toBe(false);
    }
  });

  it("relocates the accent when a style would place it on the primary", () => {
    // Force a pathological offset through a hand-built context.
    const ctx: PaletteContext = {
      mode: "light",
      identity: deriveIdentity("#3b82f6"),
      style: { ...resolveStyle("balanced"), accentOffset: 2 },
    };
    const palette = buildPalette(ctx);
    // The generator's guard must have relocated it away from the primary.
    expect(Math.abs(palette.primary.h - palette.accent.h)).toBeGreaterThanOrEqual(18);
  });

  it("keeps mutedForeground quieter than foreground and still ordered", () => {
    for (const mode of MODES) {
      const { palette } = generateRolePalette(context("#3b82f6", mode, "balanced"));
      const delta = Math.abs(palette.foreground.l - palette.mutedForeground.l);
      expect(delta).toBeGreaterThanOrEqual(DEFAULT_RELATIONSHIP_THRESHOLDS.mutedQuieter);
    }
  });

  it("separates destructive from success", () => {
    for (const seed of SEEDS) {
      const { palette } = generateRolePalette(context(seed, "light", "balanced"));
      const { destructive, success } = palette;
      const distance = Math.hypot(destructive.l - success.l, destructive.c - success.c);
      expect(distance, seed).toBeGreaterThan(0);
      // Hue is the dominant separator for these two families.
      expect(Math.abs(destructive.h - success.h)).toBeGreaterThan(30);
    }
  });
});

describe("relationships — detection and repair", () => {
  it("detects a deliberately collapsed surface pair", () => {
    const ctx = context("#3b82f6", "light", "balanced");
    const palette = buildPalette(ctx);
    const broken: Palette = { ...palette, card: withLightness(palette.card, palette.background.l) };

    const issues = checkRelationships(broken, ctx);
    expect(issues.some((issue) => issue.check === "surface-separation")).toBe(true);
  });

  it("detects an invisible border", () => {
    const ctx = context("#3b82f6", "light", "balanced");
    const palette = buildPalette(ctx);
    const broken: Palette = { ...palette, border: withLightness(palette.border, palette.background.l) };

    const issues = checkRelationships(broken, ctx);
    expect(issues.some((issue) => issue.check === "border-visibility")).toBe(true);
  });

  it("honours the explicit flat-surface opt-in", () => {
    const ctx = context("#3b82f6", "light", "balanced");
    const palette = buildPalette(ctx);
    const flat: Palette = { ...palette, card: withLightness(palette.card, palette.background.l) };

    expect(checkRelationships(flat, ctx).some((i) => i.check === "surface-separation")).toBe(true);
    expect(
      checkRelationships(flat, ctx, { flatSurfaces: true }).some((i) => i.check === "surface-separation"),
    ).toBe(false);
  });

  it("repairs a collapsed surface separation", () => {
    const ctx = context("#3b82f6", "light", "balanced");
    const palette = buildPalette(ctx);
    palette.card = withLightness(palette.card, palette.background.l);

    const adjustments = enforceRelationships(palette, ctx);
    expect(adjustments.some((a) => a.role === "card")).toBe(true);
    expect(Math.abs(palette.card.l - palette.background.l)).toBeGreaterThanOrEqual(
      DEFAULT_RELATIONSHIP_THRESHOLDS.backgroundCard,
    );
  });

  it("respects custom thresholds", () => {
    const ctx = context("#3b82f6", "light", "balanced");
    const palette = buildPalette(ctx);
    const issues = checkRelationships(palette, ctx, {
      thresholds: { ...DEFAULT_RELATIONSHIP_THRESHOLDS, backgroundCard: 0.9 },
    });
    expect(issues.some((i) => i.check === "surface-separation")).toBe(true);
  });
});
