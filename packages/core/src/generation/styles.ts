/**
 * Generation styles — the *only* knobs that differentiate one visual language
 * from another.
 *
 * theme-generation.md §5: a style is not a separate algorithm. Every style runs
 * the same generators and the same solver and produces the same semantic
 * contract; a style only modulates a fixed, enumerated set of parameters. If a
 * style could skip the contrast gate it would not be a style, it would be a
 * different product.
 *
 * @packageDocumentation
 */
import { clamp } from "../color";

/** The visual languages a theme can be generated in. */
export type GenerationStyle =
  | "balanced"
  | "soft"
  | "vibrant"
  | "editorial"
  | "minimal"
  | "brand";

/** How `accent` is placed relative to `primary`. */
export type AccentRelationship = "analogous" | "complementary" | "split-complementary";

/** Whether `secondary` stays neutral or takes a hint of the brand hue. */
export type SecondaryRelationship = "neutral" | "tinted";

/**
 * The complete set of parameters a style may modulate.
 *
 * Nothing outside this interface is style-dependent — that constraint is what
 * keeps six styles from becoming six generators.
 */
export interface StyleParams {
  /** Chroma applied to neutral surfaces (the strength of the surface tint). */
  surfaceChroma: number;
  /** Multiplier applied to the seed chroma for `primary`. */
  primaryChroma: number;
  /** `secondary` leans neutral, or picks up the brand hue. */
  secondaryRelationship: SecondaryRelationship;
  /** Where `accent` sits relative to `primary`. */
  accentRelationship: AccentRelationship;
  /** Multiplier on the neutral temperature tint. `0` forces a true gray. */
  neutralTemperature: number;
  /** Border/ring strength multiplier. */
  borderStrength: number;
  /** Dark-mode background lightness — lower is deeper. */
  darkSurfaceDepth: number;
  /** Light-mode background lightness — higher is lighter. */
  lightSurfaceHeight: number;
  /** Band the seed lightness is clamped into for the light-mode primary. */
  primaryLightnessLight: readonly [number, number];
  /** Band the seed lightness is clamped into for the dark-mode primary. */
  primaryLightnessDark: readonly [number, number];
  /** Hue offset (degrees) from `primary` to `accent`. */
  accentOffset: number;
}

/**
 * The six styles. `balanced` is the default and the reference; the others each
 * move a small number of parameters in one direction so the difference is
 * legible rather than arbitrary.
 */
export const GENERATION_STYLES: Record<GenerationStyle, StyleParams> = {
  balanced: {
    surfaceChroma: 0.006,
    primaryChroma: 1,
    secondaryRelationship: "neutral",
    accentRelationship: "analogous",
    neutralTemperature: 1,
    borderStrength: 1,
    darkSurfaceDepth: 0.16,
    lightSurfaceHeight: 0.96,
    primaryLightnessLight: [0.45, 0.62],
    primaryLightnessDark: [0.68, 0.8],
    accentOffset: 32,
  },
  soft: {
    surfaceChroma: 0.01,
    primaryChroma: 0.85,
    secondaryRelationship: "tinted",
    accentRelationship: "analogous",
    neutralTemperature: 1.2,
    borderStrength: 0.8,
    darkSurfaceDepth: 0.2,
    lightSurfaceHeight: 0.955,
    primaryLightnessLight: [0.52, 0.68],
    primaryLightnessDark: [0.72, 0.84],
    accentOffset: 28,
  },
  vibrant: {
    surfaceChroma: 0.008,
    primaryChroma: 1.18,
    secondaryRelationship: "tinted",
    accentRelationship: "split-complementary",
    neutralTemperature: 0.8,
    borderStrength: 1.1,
    darkSurfaceDepth: 0.15,
    lightSurfaceHeight: 0.965,
    primaryLightnessLight: [0.5, 0.64],
    primaryLightnessDark: [0.66, 0.78],
    accentOffset: 150,
  },
  editorial: {
    surfaceChroma: 0.004,
    primaryChroma: 0.95,
    secondaryRelationship: "neutral",
    accentRelationship: "complementary",
    neutralTemperature: 0.6,
    borderStrength: 1.25,
    darkSurfaceDepth: 0.13,
    lightSurfaceHeight: 0.945,
    primaryLightnessLight: [0.36, 0.52],
    primaryLightnessDark: [0.62, 0.76],
    accentOffset: 180,
  },
  minimal: {
    surfaceChroma: 0,
    primaryChroma: 0.6,
    secondaryRelationship: "neutral",
    accentRelationship: "analogous",
    neutralTemperature: 0,
    borderStrength: 0.6,
    darkSurfaceDepth: 0.17,
    lightSurfaceHeight: 0.97,
    primaryLightnessLight: [0.42, 0.58],
    primaryLightnessDark: [0.7, 0.82],
    accentOffset: 24,
  },
  brand: {
    surfaceChroma: 0.004,
    primaryChroma: 1,
    secondaryRelationship: "neutral",
    accentRelationship: "analogous",
    neutralTemperature: 0.5,
    borderStrength: 0.9,
    darkSurfaceDepth: 0.14,
    lightSurfaceHeight: 0.955,
    // The brand band is deliberately the widest of the six. "Brand" means the
    // seed *is* the anchor: a near-black brand must stay near-black, and a white
    // brand must stay near-white. Contrast repair still applies — it moves the
    // ink first and the surface only as far as it must.
    primaryLightnessLight: [0.18, 0.7],
    primaryLightnessDark: [0.72, 0.98],
    accentOffset: 30,
  },
};

/**
 * Every style name, as a runtime list.
 *
 * Exported publicly so the CLI and the docs can validate a `--style` argument
 * against the real set rather than re-listing it.
 */
export const GENERATION_STYLE_NAMES: readonly GenerationStyle[] = [
  "balanced",
  "soft",
  "vibrant",
  "editorial",
  "minimal",
  "brand",
];

/**
 * Resolve a style name (or its absence) to its parameters.
 *
 * Omitting the style yields `balanced`, so an existing `{ seed, family }` call
 * keeps working with no change at the call site.
 *
 * @param style - The requested style, if any.
 * @returns The parameters for that style.
 */
export function resolveStyle(style?: GenerationStyle): StyleParams {
  return GENERATION_STYLES[style ?? "balanced"];
}

/** Clamp a seed lightness into a style's band. */
export function clampToBand(lightness: number, band: readonly [number, number]): number {
  return clamp(lightness, band[0], band[1]);
}
