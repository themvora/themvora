/**
 * The generation quality report.
 *
 * theme-generation.md Phase 9 asks the generator to be able to explain itself:
 * per-pair contrast, palette characteristics, and light↔dark identity. This is
 * what the CLI's verbose mode and the docs consume; the raw adjustment list is
 * also where the `TV_GENERATION_CONTRAST_REPAIR` detail lives.
 *
 * The report is **derived**, never stored: it runs the pipeline again rather than
 * reading state, so it cannot drift from what generation actually does.
 *
 * @packageDocumentation
 */
import { contrastRatio, hueDistance, oklchToRgb, type Oklch } from "../color";
import { SEMANTIC_PAIRS, targetFor } from "./contract";
import { deriveIdentity } from "./identity";
import { generateRolePalette } from "./pipeline";
import { resolveStyle, type GenerationStyle } from "./styles";
import type { Mode, Palette } from "./types";
import type { Adjustment, UnsatisfiedConstraint } from "./solver";
import type { RelationshipIssue } from "./relationships";

/** One row of the contrast section. */
export interface ReportContrastRow {
  /** `foreground/background`. */
  pair: string;
  /** The measured ratio. */
  ratio: number;
  /** The ratio the solver targeted. */
  target: number;
  /** Whether the target was met. */
  passes: boolean;
}

/** The palette section: the numbers the relationship checks reason about. */
export interface ReportPalette {
  /** Chroma of the primary. */
  primaryChroma: number;
  /** Hue distance (degrees) between primary and accent. */
  accentHueDistance: number;
  /** ΔL between background and card. */
  surfaceSeparation: number;
  /** ΔE between destructive and success. */
  statusSeparation: number;
}

/** The light↔dark identity section. */
export interface ReportModeIdentity {
  /** Hue of the primary in each mode. */
  primaryHue: { light: number; dark: number };
  /** Absolute hue drift of the primary between modes, in degrees. */
  primaryHueDrift: number;
  /** Whether the neutral temperature survived the mode change. */
  temperatureStable: boolean;
}

/** A per-mode report. */
export interface ModeReport {
  /** The mode. */
  mode: Mode;
  /** Per-pair contrast. */
  contrast: ReportContrastRow[];
  /** Palette characteristics. */
  palette: ReportPalette;
  /** Every repair the solver made. */
  adjustments: Adjustment[];
  /** Relationship checks still failing (expected: empty). */
  relationshipIssues: RelationshipIssue[];
  /** Constraints the solver could not satisfy (expected: empty). */
  unsatisfied: UnsatisfiedConstraint[];
}

/** The full generation report. */
export interface GenerationReport {
  /** The algorithm that produced it. */
  algorithm: string;
  /** The seed, verbatim. */
  seed: string;
  /** The style used. */
  style: GenerationStyle;
  /** Per-mode detail. */
  modes: { light: ModeReport; dark: ModeReport };
  /** Light↔dark identity summary. */
  identity: ReportModeIdentity;
}

function ratio(fg: Oklch, bg: Oklch): number {
  return contrastRatio(oklchToRgb(fg), oklchToRgb(bg));
}

function buildModeReport(mode: Mode, palette: Palette): ModeReport {
  const contrast = SEMANTIC_PAIRS.map((pair) => {
    const value = ratio(palette[pair.foreground], palette[pair.background]);
    const target = targetFor(pair.requirement);
    return {
      pair: `${pair.foreground}/${pair.background}`,
      ratio: value,
      target,
      passes: value >= target,
    };
  });

  return {
    mode,
    contrast,
    palette: {
      primaryChroma: palette.primary.c,
      accentHueDistance: hueDistance(palette.primary.h, palette.accent.h),
      surfaceSeparation: Math.abs(palette.card.l - palette.background.l),
      statusSeparation: Math.hypot(
        palette.destructive.l - palette.success.l,
        palette.destructive.c - palette.success.c,
      ),
    },
    adjustments: [],
    relationshipIssues: [],
    unsatisfied: [],
  };
}

/**
 * Build the quality report for a seed and style.
 *
 * @param seed - The seed color.
 * @param style - The style name, if any.
 * @returns The report, with both modes and the light↔dark identity summary.
 * @throws {ColorError} When the seed cannot be parsed.
 */
export function buildGenerationReport(
  seed: string,
  style?: GenerationStyle,
): GenerationReport {
  const identity = deriveIdentity(seed);
  const params = resolveStyle(style);

  const light = generateRolePalette({ mode: "light", identity, style: params });
  const dark = generateRolePalette({ mode: "dark", identity, style: params });

  const lightReport = buildModeReport("light", light.palette);
  lightReport.adjustments = light.adjustments;
  lightReport.relationshipIssues = light.relationshipIssues;
  lightReport.unsatisfied = light.unsatisfied;

  const darkReport = buildModeReport("dark", dark.palette);
  darkReport.adjustments = dark.adjustments;
  darkReport.relationshipIssues = dark.relationshipIssues;
  darkReport.unsatisfied = dark.unsatisfied;

  const primaryHueDrift = hueDistance(light.palette.primary.h, dark.palette.primary.h);

  return {
    algorithm: "semantic-v2",
    seed,
    style: style ?? "balanced",
    modes: { light: lightReport, dark: darkReport },
    identity: {
      primaryHue: { light: light.palette.primary.h, dark: dark.palette.primary.h },
      primaryHueDrift,
      temperatureStable: primaryHueDrift <= 1,
    },
  };
}
